using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Application.Services;

public class StatsAppService : IStatsAppService
{
    private readonly ITrackRepository _trackRepository;
    private readonly IStreamingRecordRepository _streamingRecordRepository;
    private readonly ISpotifyUserRepository _userRepository;
    private readonly ISpotifyApiClient _spotifyApiClient;
    private readonly IMapper _mapper;

    public StatsAppService(
        ITrackRepository trackRepository, 
        IStreamingRecordRepository streamingRecordRepository,
        ISpotifyUserRepository userRepository,
        ISpotifyApiClient spotifyApiClient,
        IMapper mapper)
    {
        _trackRepository = trackRepository;
        _streamingRecordRepository = streamingRecordRepository;
        _userRepository = userRepository;
        _spotifyApiClient = spotifyApiClient;
        _mapper = mapper;
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

        return new YearlyWrappedDto
        {
            Year = startDate?.Year ?? 0,
            TotalMinutesPlayed = (int)(totalMs / 60000),
            UniqueTracksCount = uniqueTracks,
            UniqueArtistsCount = uniqueArtists,
            TopArtistName = topArtist,
            TopArtistPlayCount = topArtistCount
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
            try
            {
                var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
                if (user != null)
                {
                    if (user.IsTokenExpired())
                    {
                        Console.WriteLine("[StatsAppService] User token expired. Refreshing token...");
                        var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                        user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                        await _userRepository.UpdateAsync(user);
                    }

                    var fetchedImages = await _spotifyApiClient.GetTrackImagesAsync(missingImageTrackIds, user.AccessToken);
                    Console.WriteLine($"[StatsAppService] Fetched {fetchedImages.Count} images from Spotify");
                    var updatedTracks = new List<Track>();
                    foreach (var imgInfo in fetchedImages)
                    {
                        var trackData = topTracksData.FirstOrDefault(t => t.Track.SpotifyTrackUri == imgInfo.TrackUri);
                        if (trackData.Track != null)
                        {
                            Console.WriteLine($"[StatsAppService] Mapping image url to track: {trackData.Track.TrackName} -> {imgInfo.ImageUrl}");
                            trackData.Track.ImageUrl = imgInfo.ImageUrl;
                            updatedTracks.Add(trackData.Track);
                        }
                        else
                        {
                            Console.WriteLine($"[StatsAppService] Warning: Could not find track in topTracksData matching URI: {imgInfo.TrackUri}");
                        }
                    }

                    if (updatedTracks.Any())
                    {
                        Console.WriteLine($"[StatsAppService] Saving {updatedTracks.Count} tracks with ImageUrls to database...");
                        await _trackRepository.BulkAddOrUpdateAsync(updatedTracks);
                    }
                }
                else
                {
                    Console.WriteLine($"[StatsAppService] Spotify user not found for ID: {spotifyUserId}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StatsAppService] Failed to load missing track images: {ex.Message}");
            }
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

        var items = new List<WrappedArtistDto>();
        foreach (var item in topArtistsData)
        {
            items.Add(new WrappedArtistDto
            {
                ArtistName = item.ArtistName,
                PlayCount = item.PlayCount,
                TotalMinutesPlayed = item.TotalMinutes
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
}

