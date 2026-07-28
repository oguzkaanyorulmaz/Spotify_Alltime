using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Infrastructure.Persistence.Repositories;

public class StreamingRecordRepository : IStreamingRecordRepository
{
    private readonly SpotifyDbContext _context;

    public StreamingRecordRepository(SpotifyDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(StreamingRecord record)
    {
        await _context.StreamingRecords.AddAsync(record);
        await _context.SaveChangesAsync();
    }

    public async Task BulkAddAsync(IEnumerable<StreamingRecord> records)
    {
        await _context.StreamingRecords.AddRangeAsync(records);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(string spotifyUserId, string trackUri, DateTime playedAt)
    {
        return await _context.StreamingRecords.AnyAsync(r => 
            r.SpotifyUserId == spotifyUserId && 
            r.SpotifyTrackUri == trackUri && 
            r.PlayedAt == playedAt);
    }
}
