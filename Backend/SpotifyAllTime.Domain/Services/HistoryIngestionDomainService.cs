using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Common.Constants;
using SpotifyAllTime.Domain.Common.Enums;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Domain.Services;

public class HistoryIngestionDomainService : IHistoryIngestionDomainService
{
    private readonly ITrackRepository _trackRepository;
    private readonly IStreamingRecordRepository _streamingRecordRepository;

    public HistoryIngestionDomainService(
        ITrackRepository trackRepository,
        IStreamingRecordRepository streamingRecordRepository)
    {
        _trackRepository = trackRepository;
        _streamingRecordRepository = streamingRecordRepository;
    }

    public async Task<(int ImportedCount, int SkippedCount)> IngestHistoryJsonAsync(string spotifyUserId, string jsonContent)
    {
        using var document = JsonDocument.Parse(jsonContent);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            throw new ArgumentException("JSON koku bir dizi (array) olmalidir.");
        }

        var importedCount = 0;
        var skippedCount = 0;

        var tracksToSave = new Dictionary<string, Track>();
        var recordsToSave = new List<StreamingRecord>();
        var processedRecords = new HashSet<(string TrackUri, DateTime PlayedAt)>();

        foreach (var element in document.RootElement.EnumerateArray())
        {
            if (!element.TryGetProperty("spotify_track_uri", out var uriProp) || uriProp.ValueKind == JsonValueKind.Null)
            {
                skippedCount++;
                continue;
            }

            var trackUri = uriProp.GetString();
            if (string.IsNullOrWhiteSpace(trackUri))
            {
                skippedCount++;
                continue;
            }

            var skipped = element.TryGetProperty("skipped", out var skippedProp) && skippedProp.ValueKind == JsonValueKind.True;
            var msPlayed = element.TryGetProperty("ms_played", out var msPlayedProp) ? msPlayedProp.GetInt32() : 0;

            if (skipped || msPlayed < SpotifyConstants.MinimumPlayMs)
            {
                skippedCount++;
                continue;
            }

            var tsStr = element.GetProperty("ts").GetString();
            if (!DateTime.TryParse(tsStr, out var playedAt))
            {
                skippedCount++;
                continue;
            }

            var trackName = element.GetProperty("master_metadata_track_name").GetString() ?? "Bilinmeyen Sarki";
            var artistName = element.GetProperty("master_metadata_album_artist_name").GetString() ?? "Bilinmeyen Sanatci";
            var albumName = element.GetProperty("master_metadata_album_album_name").GetString() ?? "Bilinmeyen Album";

            // Bellek içi de-duplication (Aynı dosya/batch içindeki mükerrer kayıtları veri tabanına gitmeden eler)
            if (!processedRecords.Add((trackUri, playedAt)))
            {
                skippedCount++;
                continue;
            }

            if (!tracksToSave.TryGetValue(trackUri, out var track))
            {
                track = await _trackRepository.GetByUriAsync(trackUri) ?? new Track
                {
                    SpotifyTrackUri = trackUri,
                    TrackName = trackName,
                    ArtistName = artistName,
                    AlbumName = albumName,
                    PlayCount = 0
                };
                tracksToSave[trackUri] = track;
            }

            var alreadyExists = await _streamingRecordRepository.ExistsAsync(spotifyUserId, trackUri, playedAt);
            if (alreadyExists)
            {
                skippedCount++;
                continue;
            }

            track.IncrementPlayCount(1);

            recordsToSave.Add(new StreamingRecord
            {
                Id = Guid.NewGuid(),
                SpotifyUserId = spotifyUserId,
                SpotifyTrackUri = trackUri,
                PlayedAt = playedAt,
                MsPlayed = msPlayed,
                Source = SyncSource.HistoryImport
            });

            importedCount++;
        }

        if (recordsToSave.Any())
        {
            await _trackRepository.BulkAddOrUpdateAsync(tracksToSave.Values);
            await _streamingRecordRepository.BulkAddAsync(recordsToSave);
        }

        return (importedCount, skippedCount);
    }
}
