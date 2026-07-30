using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Common.Constants;
using SpotifyAllTime.Domain.Common.Enums;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Domain.Services;

public class SpotifySyncDomainService : ISpotifySyncDomainService
{
    private readonly ISpotifyUserRepository _userRepository;
    private readonly ITrackRepository _trackRepository;
    private readonly IStreamingRecordRepository _streamingRecordRepository;
    private readonly ISpotifyApiClient _spotifyApiClient;

    public SpotifySyncDomainService(
        ISpotifyUserRepository userRepository,
        ITrackRepository trackRepository,
        IStreamingRecordRepository streamingRecordRepository,
        ISpotifyApiClient spotifyApiClient)
    {
        _userRepository = userRepository;
        _trackRepository = trackRepository;
        _streamingRecordRepository = streamingRecordRepository;
        _spotifyApiClient = spotifyApiClient;
    }

    public async Task SyncRecentlyPlayedAsync(string spotifyUserId)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null) return;

        if (user.IsTokenExpired())
        {
            var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
            user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
            await _userRepository.UpdateAsync(user);
        }

        var recentlyPlayed = await _spotifyApiClient.GetRecentlyPlayedAsync(user.AccessToken);
        var tracksToSave = new Dictionary<string, Track>();
        var recordsToSave = new List<StreamingRecord>();

        foreach (var item in recentlyPlayed)
        {
            if (item.MsPlayed < SpotifyConstants.MinimumPlayMs) continue;

            var alreadyExists = await _streamingRecordRepository.ExistsAsync(spotifyUserId, item.TrackUri, item.PlayedAt);
            if (alreadyExists) continue;

            if (!tracksToSave.TryGetValue(item.TrackUri, out var track))
            {
                track = await _trackRepository.GetByUriAsync(item.TrackUri) ?? new Track
                {
                    SpotifyTrackUri = item.TrackUri,
                    TrackName = item.TrackName,
                    ArtistName = item.ArtistName,
                    AlbumName = item.AlbumName,
                    PlayCount = 0
                };
                tracksToSave[item.TrackUri] = track;
            }

            track.IncrementPlayCount(1);

            recordsToSave.Add(new StreamingRecord
            {
                Id = Guid.NewGuid(),
                SpotifyUserId = spotifyUserId,
                SpotifyTrackUri = item.TrackUri,
                PlayedAt = item.PlayedAt,
                MsPlayed = item.MsPlayed,
                Source = SyncSource.RecentlyPlayedService
            });
        }

        if (recordsToSave.Any())
        {
            await _trackRepository.BulkAddOrUpdateAsync(tracksToSave.Values);
            await _streamingRecordRepository.BulkAddAsync(recordsToSave);
            await _trackRepository.RecalculateTrackPlayCountsAsync();
        }
    }

    public async Task<string> SyncTop100PlaylistAsync(string spotifyUserId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null) throw new Exception("Kullanıcı bulunamadı.");

        if (user.IsTokenExpired())
        {
            var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
            user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
            await _userRepository.UpdateAsync(user);
        }

        string playlistName = "True All-Time Top 100";
        string targetPlaylistId = string.Empty;

        if (startDate.HasValue && endDate.HasValue)
        {
            if (startDate.Value.Year == endDate.Value.Year && 
                startDate.Value.Month == 1 && startDate.Value.Day == 1 && 
                endDate.Value.Month == 12 && endDate.Value.Day == 31)
            {
                playlistName = $"True {startDate.Value.Year} Most Listened Songs";
            }
            else
            {
                playlistName = $"True Top 100 ({startDate.Value:yyyy-MM-dd} - {endDate.Value:yyyy-MM-dd})";
            }
            
            targetPlaylistId = await _spotifyApiClient.CreatePlaylistAsync(user.AccessToken, user.SpotifyUserId, playlistName);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(user.TargetPlaylistId))
            {
                targetPlaylistId = await _spotifyApiClient.CreatePlaylistAsync(user.AccessToken, user.SpotifyUserId, playlistName);
                user.TargetPlaylistId = targetPlaylistId;
                await _userRepository.UpdateAsync(user);
            }
            else
            {
                targetPlaylistId = user.TargetPlaylistId;
            }
        }

        List<string> trackUris;
        if (startDate.HasValue || endDate.HasValue)
        {
            var topTracks = await _streamingRecordRepository.GetTopTracksPagedAsync(spotifyUserId, startDate, endDate, 1, 100, "playcount");
            trackUris = topTracks.Select(t => t.Track.SpotifyTrackUri).ToList();
        }
        else
        {
            var topTracks = await _trackRepository.GetTopTracksAsync(100);
            trackUris = topTracks.Select(t => t.SpotifyTrackUri).ToList();
        }

        if (trackUris.Any())
        {
            await _spotifyApiClient.ReplacePlaylistItemsAsync(user.AccessToken, targetPlaylistId, trackUris);
        }

        return targetPlaylistId;
    }

    public async Task<(bool IsPlaying, string Title, string Artist, string Album, string? ImageUrl)?> GetCurrentlyPlayingAsync(string spotifyUserId)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null) return null;

        if (user.IsTokenExpired())
        {
            try
            {
                var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                await _userRepository.UpdateAsync(user);
            }
            catch (Exception) { /* ignore and let client call fail/retry */ }
        }

        var result = await _spotifyApiClient.GetCurrentlyPlayingAsync(user.AccessToken);
        if (result == null)
        {
            // First call returned null (likely 401 Unauthorized because token became invalid).
            // Let's force refresh token and try again.
            try
            {
                var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                await _userRepository.UpdateAsync(user);

                result = await _spotifyApiClient.GetCurrentlyPlayingAsync(user.AccessToken);
            }
            catch (Exception)
            {
                return null;
            }
        }

        return result;
    }

    public async Task<string> SyncCustomPlaylistAsync(
        string spotifyUserId, 
        string playlistName, 
        int? startYear, 
        int? endYear, 
        List<string>? includedArtists, 
        List<string>? excludedArtists, 
        int trackCount,
        bool fillMissing,
        bool useRandom)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null) throw new Exception("Kullanıcı bulunamadı.");

        if (user.IsTokenExpired())
        {
            try
            {
                var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                await _userRepository.UpdateAsync(user);
            }
            catch (Exception ex)
            {
                throw new Exception("Spotify bağlantısı yenilenemedi, lütfen tekrar giriş yapın.", ex);
            }
        }

        var trackUris = await _streamingRecordRepository.GetCustomFilteredTrackUrisAsync(
            spotifyUserId,
            startYear,
            endYear,
            includedArtists,
            excludedArtists,
            trackCount,
            useRandom
        );

        if (trackUris == null || !trackUris.Any())
        {
            throw new Exception("Belirtilen filtrelere uygun şarkı geçmişi bulunamadı.");
        }

        if (fillMissing && trackUris.Count < trackCount)
        {
            int missingCount = trackCount - trackUris.Count;
            var fillerTrackUris = await _streamingRecordRepository.GetCustomFilteredTrackUrisAsync(
                spotifyUserId,
                startYear,
                endYear,
                null,
                excludedArtists,
                trackCount,
                useRandom
            );

            if (fillerTrackUris != null && fillerTrackUris.Any())
            {
                var uniqueFillerTracks = fillerTrackUris
                    .Where(uri => !trackUris.Contains(uri))
                    .Take(missingCount);

                trackUris.AddRange(uniqueFillerTracks);
            }
        }

        if (useRandom)
        {
            var rng = new Random();
            trackUris = trackUris.OrderBy(_ => rng.Next()).ToList();
        }

        string playlistId;
        try
        {
            playlistId = await _spotifyApiClient.CreatePlaylistAsync(user.AccessToken, user.SpotifyUserId, playlistName);
        }
        catch (Exception)
        {
            try
            {
                var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
                user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
                await _userRepository.UpdateAsync(user);

                playlistId = await _spotifyApiClient.CreatePlaylistAsync(user.AccessToken, user.SpotifyUserId, playlistName);
            }
            catch (Exception innerEx)
            {
                throw new Exception("Çalma listesi oluşturulurken Spotify hatası alındı.", innerEx);
            }
        }

        try
        {
            await _spotifyApiClient.ReplacePlaylistItemsAsync(user.AccessToken, playlistId, trackUris);
        }
        catch (Exception ex)
        {
            throw new Exception("Çalma listesine şarkılar eklenirken hata oluştu.", ex);
        }

        return playlistId;
    }

    public async Task<List<int>> GetAvailableYearsAsync(string spotifyUserId)
    {
        return await _streamingRecordRepository.GetAvailableYearsAsync(spotifyUserId);
    }
}
