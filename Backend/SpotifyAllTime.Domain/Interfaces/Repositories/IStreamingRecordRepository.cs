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
}
