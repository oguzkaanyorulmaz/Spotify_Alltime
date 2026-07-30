using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using AutoMapper;
using Microsoft.Extensions.DependencyInjection;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Application.Services;

public class StatsAppService : IStatsAppService
{
    private static readonly ConcurrentDictionary<string, string> ArtistImageCache = new();
    private static readonly ConcurrentDictionary<string, List<string>> ArtistGenreCache = new();

    private readonly ITrackRepository _trackRepository;
    private readonly IStreamingRecordRepository _streamingRecordRepository;
    private readonly ISpotifyUserRepository _userRepository;
    private readonly ISpotifyApiClient _spotifyApiClient;
    private readonly IMapper _mapper;
    private readonly IServiceScopeFactory _scopeFactory;

    public StatsAppService(
        ITrackRepository trackRepository, 
        IStreamingRecordRepository streamingRecordRepository,
        ISpotifyUserRepository userRepository,
        ISpotifyApiClient spotifyApiClient,
        IMapper mapper,
        IServiceScopeFactory scopeFactory)
    {
        _trackRepository = trackRepository;
        _streamingRecordRepository = streamingRecordRepository;
        _userRepository = userRepository;
        _spotifyApiClient = spotifyApiClient;
        _mapper = mapper;
        _scopeFactory = scopeFactory;
    }

    public async Task<List<TrackDto>> GetTop100TracksAsync()
    {
        var tracks = await _trackRepository.GetTopTracksAsync(100);
        return _mapper.Map<List<TrackDto>>(tracks);
    }

    public async Task<YearlyWrappedDto> GetWrappedStatsAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate)
    {
        var (totalMs, uniqueTracks, uniqueArtists, topArtist, topArtistCount) = 
            await _streamingRecordRepository.GetWrappedStatsAsync(spotifyUserId, startDate, endDate);

        // Fetch the absolute top track (Rank #1) for this period (Page=1, PageSize=1, SortBy="playcount")
        var topTracks = await _streamingRecordRepository.GetTopTracksPagedAsync(spotifyUserId, startDate, endDate, 1, 1, "playcount");
        var topTrack = topTracks.FirstOrDefault();

        // Calculate top genres from the top 20 artists in this period
        var topArtists = await _streamingRecordRepository.GetTopArtistsPagedAsync(spotifyUserId, startDate, endDate, 1, 20, "playcount");
        
        var missingArtistsForGenres = topArtists
            .Select(a => a.ArtistName)
            .Where(name => !ArtistGenreCache.ContainsKey(name))
            .Distinct()
            .ToList();

        if (missingArtistsForGenres.Any())
        {
            try
            {
                var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
                if (user != null)
                {
                    var accessToken = user.AccessToken;
                    if (user.IsTokenExpired())
                    {
                        var (newAccessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                        user.UpdateTokens(newAccessToken, user.RefreshToken, expiresInSeconds);
                        await _userRepository.UpdateAsync(user);
                        accessToken = newAccessToken;
                    }
                    var tasks = missingArtistsForGenres.Select(async artistName =>
                    {
                        try
                        {
                            var result = await _spotifyApiClient.GetArtistDetailsAsync(artistName, accessToken);
                            if (!string.IsNullOrEmpty(result.ImageUrl))
                            {
                                ArtistImageCache[artistName] = result.ImageUrl;
                            }
                            if (result.Genres != null && result.Genres.Any())
                            {
                                ArtistGenreCache[artistName] = result.Genres;
                            }
                        }
                        catch {}
                    }).ToList();
                    await Task.WhenAll(tasks);
                }
            }
            catch {}
        }

        var genreCounts = new Dictionary<string, int>();
        foreach (var item in topArtists)
        {
            if (ArtistGenreCache.TryGetValue(item.ArtistName, out var genres) && genres != null)
            {
                foreach (var genre in genres)
                {
                    var capitalizedGenre = System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(genre);
                    if (genreCounts.ContainsKey(capitalizedGenre))
                    {
                        genreCounts[capitalizedGenre] += item.PlayCount;
                    }
                    else
                    {
                        genreCounts[capitalizedGenre] = item.PlayCount;
                    }
                }
            }
        }

        var topGenres = genreCounts
            .OrderByDescending(g => g.Value)
            .Take(10)
            .Select(g => new GenreCountDto { Genre = g.Key, PlayCount = g.Value })
            .ToList();

        return new YearlyWrappedDto
        {
            Year = startDate?.Year ?? 0,
            TotalMinutesPlayed = (int)(totalMs / 60000),
            UniqueTracksCount = uniqueTracks,
            UniqueArtistsCount = uniqueArtists,
            TopArtistName = topArtist,
            TopArtistPlayCount = topArtistCount,
            TopTrackTitle = topTrack.Track?.TrackName ?? string.Empty,
            TopTrackArtistName = topTrack.Track?.ArtistName ?? string.Empty,
            TopTrackMinutesPlayed = topTrack.TotalMinutes,
            TopGenres = topGenres
        };
    }

    public async Task<PagedResultDto<WrappedTrackDto>> GetTopTracksPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy)
    {
        var totalCount = await _streamingRecordRepository.GetTopTracksCountAsync(spotifyUserId, startDate, endDate);
        var topTracksData = await _streamingRecordRepository.GetTopTracksPagedAsync(spotifyUserId, startDate, endDate, page, pageSize, sortBy);

        Console.WriteLine($"[StatsAppService] GetTopTracksPagedAsync - page: {page}, pageSize: {pageSize}. Total loaded tracks: {topTracksData.Count}");

        // Fetch missing images from Spotify in a single batch (filter out non-catalog/local tracks)
        var missingImageTrackIds = topTracksData
            .Where(t => string.IsNullOrEmpty(t.Track.ImageUrl))
            .Select(t => t.Track.SpotifyTrackUri.Replace("spotify:track:", ""))
            .Where(id => id.Length == 22 && id.All(c => char.IsLetterOrDigit(c)))
            .Distinct()
            .ToList();

        Console.WriteLine($"[StatsAppService] Missing image count in this page: {missingImageTrackIds.Count}");

        if (missingImageTrackIds.Any())
        {
            // Fire and forget background task to load missing track images asynchronously
            _ = Task.Run(async () =>
            {
                try
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var spotifyApiClient = scope.ServiceProvider.GetRequiredService<ISpotifyApiClient>();
                        var userRepository = scope.ServiceProvider.GetRequiredService<ISpotifyUserRepository>();
                        var trackRepository = scope.ServiceProvider.GetRequiredService<ITrackRepository>();

                        var user = await userRepository.GetBySpotifyIdAsync(spotifyUserId);
                        if (user != null)
                        {
                            var accessToken = user.AccessToken;
                            if (user.IsTokenExpired())
                            {
                                Console.WriteLine("[StatsAppService] User token expired for background track images. Refreshing...");
                                var (newAccessToken, expiresInSeconds) = await spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                                user.UpdateTokens(newAccessToken, user.RefreshToken, expiresInSeconds);
                                await userRepository.UpdateAsync(user);
                                accessToken = newAccessToken;
                            }

                            var fetchedImages = await spotifyApiClient.GetTrackImagesAsync(missingImageTrackIds, accessToken);
                            Console.WriteLine($"[StatsAppService] Background: Fetched {fetchedImages.Count} images from Spotify");
                            
                            var updatedTracks = new List<Track>();
                            foreach (var imgInfo in fetchedImages)
                            {
                                var track = await trackRepository.GetByUriAsync(imgInfo.TrackUri);
                                if (track != null)
                                {
                                    track.ImageUrl = imgInfo.ImageUrl;
                                    updatedTracks.Add(track);
                                }
                            }

                            if (updatedTracks.Any())
                            {
                                Console.WriteLine($"[StatsAppService] Background: Saving {updatedTracks.Count} tracks with ImageUrls to database...");
                                await trackRepository.BulkAddOrUpdateAsync(updatedTracks);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[StatsAppService] Background: Failed to load missing track images: {ex.Message}");
                }
            });
        }

        var items = new List<WrappedTrackDto>();
        foreach (var item in topTracksData)
        {
            items.Add(new WrappedTrackDto
            {
                SpotifyTrackId = item.Track.SpotifyTrackUri.Replace("spotify:track:", ""),
                Title = item.Track.TrackName,
                Artist = item.Track.ArtistName,
                Album = item.Track.AlbumName,
                PlayCount = item.Track.PlayCount,
                TotalMinutesPlayed = item.TotalMinutes,
                ImageUrl = item.Track.ImageUrl
            });
        }

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        return new PagedResultDto<WrappedTrackDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<PagedResultDto<WrappedArtistDto>> GetTopArtistsPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy)
    {
        var totalCount = await _streamingRecordRepository.GetTopArtistsCountAsync(spotifyUserId, startDate, endDate);
        var topArtistsData = await _streamingRecordRepository.GetTopArtistsPagedAsync(spotifyUserId, startDate, endDate, page, pageSize, sortBy);

        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        var accessToken = user?.AccessToken;

        if (user != null && user.IsTokenExpired())
        {
            try
            {
                Console.WriteLine("[StatsAppService] User token expired. Refreshing token for artist images...");
                var (newAccessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                user.UpdateTokens(newAccessToken, user.RefreshToken, expiresInSeconds);
                await _userRepository.UpdateAsync(user);
                accessToken = newAccessToken;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StatsAppService] Failed to refresh token for artist images: {ex.Message}");
            }
        }

        if (user != null && !string.IsNullOrEmpty(accessToken))
        {
            var missingArtists = topArtistsData
                .Select(item => item.ArtistName)
                .Where(name => !ArtistImageCache.ContainsKey(name) || !ArtistGenreCache.ContainsKey(name))
                .Distinct()
                .ToList();

            if (missingArtists.Any())
            {
                // Fire and forget background task to fetch missing artist images asynchronously
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using (var scope = _scopeFactory.CreateScope())
                        {
                            var spotifyApiClient = scope.ServiceProvider.GetRequiredService<ISpotifyApiClient>();
                            var userRepository = scope.ServiceProvider.GetRequiredService<ISpotifyUserRepository>();

                            var scopeUser = await userRepository.GetBySpotifyIdAsync(spotifyUserId);
                            if (scopeUser != null)
                            {
                                var scopeAccessToken = scopeUser.AccessToken;
                                if (scopeUser.IsTokenExpired())
                                {
                                    Console.WriteLine("[StatsAppService] User token expired for background artist images. Refreshing...");
                                    var (newAccessToken, expiresInSeconds) = await spotifyApiClient.RefreshTokenAsync(scopeUser.RefreshToken);
                                    scopeUser.UpdateTokens(newAccessToken, scopeUser.RefreshToken, expiresInSeconds);
                                    await userRepository.UpdateAsync(scopeUser);
                                    scopeAccessToken = newAccessToken;
                                }

                                Console.WriteLine($"[StatsAppService] Fetching {missingArtists.Count} artist details in background...");
                                var tasks = missingArtists.Select(async artistName =>
                                {
                                    var result = await spotifyApiClient.GetArtistDetailsAsync(artistName, scopeAccessToken);
                                    if (!string.IsNullOrEmpty(result.ImageUrl))
                                    {
                                        ArtistImageCache[artistName] = result.ImageUrl;
                                    }
                                    if (result.Genres != null && result.Genres.Any())
                                    {
                                        ArtistGenreCache[artistName] = result.Genres;
                                    }
                                }).ToList();
                                await Task.WhenAll(tasks);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StatsAppService] Background: Error fetching artist images: {ex.Message}");
                    }
                });
            }
        }

        var items = new List<WrappedArtistDto>();
        foreach (var item in topArtistsData)
        {
            ArtistImageCache.TryGetValue(item.ArtistName, out var cachedImageUrl);

            items.Add(new WrappedArtistDto
            {
                ArtistName = item.ArtistName,
                PlayCount = item.PlayCount,
                TotalMinutesPlayed = item.TotalMinutes,
                ImageUrl = cachedImageUrl ?? item.ImageUrl
            });
        }

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        return new PagedResultDto<WrappedArtistDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<List<PeriodPlayCountDto>> GetTrackPlayHistoryAsync(string spotifyUserId, string trackUri)
    {
        var rawData = await _streamingRecordRepository.GetTrackPlayHistoryAsync(spotifyUserId, trackUri);
        return rawData.Select(x => new PeriodPlayCountDto
        {
            Period = x.Period,
            PlayCount = x.PlayCount
        }).ToList();
    }

    public async Task<List<PeriodPlayCountDto>> GetArtistPlayHistoryAsync(string spotifyUserId, string artistName)
    {
        var rawData = await _streamingRecordRepository.GetArtistPlayHistoryAsync(spotifyUserId, artistName);
        return rawData.Select(x => new PeriodPlayCountDto
        {
            Period = x.Period,
            PlayCount = x.PlayCount
        }).ToList();
    }

    public async Task<string?> GetLazyTrackImageAsync(string spotifyUserId, string trackId)
    {
        var trackUri = $"spotify:track:{trackId}";
        var track = await _trackRepository.GetByUriAsync(trackUri);
        if (track != null && !string.IsNullOrEmpty(track.ImageUrl))
        {
            return track.ImageUrl;
        }

        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user != null)
        {
            try
            {
                if (user.IsTokenExpired())
                {
                    var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                    user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                    await _userRepository.UpdateAsync(user);
                }

                var fetchedImages = await _spotifyApiClient.GetTrackImagesAsync(new List<string> { trackId }, user.AccessToken);
                var imgInfo = fetchedImages.FirstOrDefault();
                if (!string.IsNullOrEmpty(imgInfo.ImageUrl))
                {
                    if (track != null)
                    {
                        track.ImageUrl = imgInfo.ImageUrl;
                        await _trackRepository.UpdateAsync(track);
                    }
                    return imgInfo.ImageUrl;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StatsAppService] Error lazy-loading track image for {trackId}: {ex.Message}");
            }
        }

        return null;
    }

    public async Task<string?> GetLazyArtistImageAsync(string spotifyUserId, string artistName)
    {
        if (ArtistImageCache.TryGetValue(artistName, out var cachedImageUrl))
        {
            return cachedImageUrl;
        }

        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user != null)
        {
            try
            {
                if (user.IsTokenExpired())
                {
                    var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                    user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                    await _userRepository.UpdateAsync(user);
                }

                var result = await _spotifyApiClient.GetArtistDetailsAsync(artistName, user.AccessToken);
                if (!string.IsNullOrEmpty(result.ImageUrl))
                {
                    ArtistImageCache[artistName] = result.ImageUrl;
                }
                if (result.Genres != null && result.Genres.Any())
                {
                    ArtistGenreCache[artistName] = result.Genres;
                }
                return result.ImageUrl;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StatsAppService] Error lazy-loading artist image for {artistName}: {ex.Message}");
            }
        }

        return null;
    }
}

