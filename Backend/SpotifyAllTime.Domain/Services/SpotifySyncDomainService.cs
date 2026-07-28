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
        }
    }

    public async Task SyncTop100PlaylistAsync(string spotifyUserId)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null || string.IsNullOrWhiteSpace(user.TargetPlaylistId)) return;

        if (user.IsTokenExpired())
        {
            var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
            user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
            await _userRepository.UpdateAsync(user);
        }

        var topTracks = await _trackRepository.GetTopTracksAsync(100);
        var trackUris = topTracks.Select(t => t.SpotifyTrackUri).ToList();

        if (trackUris.Any())
        {
            await _spotifyApiClient.ReplacePlaylistItemsAsync(user.AccessToken, user.TargetPlaylistId, trackUris);
        }
    }
}
