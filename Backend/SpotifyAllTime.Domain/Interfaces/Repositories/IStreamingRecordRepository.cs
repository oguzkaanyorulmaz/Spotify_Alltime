using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Entities;

namespace SpotifyAllTime.Domain.Interfaces.Repositories;

public interface IStreamingRecordRepository
{
    Task AddAsync(StreamingRecord record);
    Task BulkAddAsync(IEnumerable<StreamingRecord> records);
    Task<bool> ExistsAsync(string spotifyUserId, string trackUri, DateTime playedAt);
    Task<List<string>> GetCustomFilteredTrackUrisAsync(string spotifyUserId, int? startYear, int? endYear, List<string>? includedArtists, List<string>? excludedArtists, int trackCount, bool useRandom);
    Task<List<int>> GetAvailableYearsAsync(string spotifyUserId);
    Task<(long TotalMs, int UniqueTracks, int UniqueArtists, string TopArtist, int TopArtistCount)> GetWrappedStatsAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate);
    Task<List<(Track Track, int TotalMinutes)>> GetTopTracksPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy);
    Task<List<(string ArtistName, int PlayCount, int TotalMinutes)>> GetTopArtistsPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy);
    Task<int> GetTopTracksCountAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate);
    Task<int> GetTopArtistsCountAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate);
    Task<List<(string Period, int PlayCount)>> GetTrackPlayHistoryAsync(string spotifyUserId, string trackUri);
    Task<List<(string Period, int PlayCount)>> GetArtistPlayHistoryAsync(string spotifyUserId, string artistName);
}

