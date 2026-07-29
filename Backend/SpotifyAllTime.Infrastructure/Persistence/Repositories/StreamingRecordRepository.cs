using System;
using System.Collections.Generic;
using System.Linq;
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

    public async Task<List<string>> GetCustomFilteredTrackUrisAsync(
        string spotifyUserId, 
        int? startYear, 
        int? endYear, 
        List<string>? includedArtists, 
        List<string>? excludedArtists, 
        int trackCount,
        bool useRandom)
    {
        var query = from s in _context.StreamingRecords
                    join t in _context.Tracks on s.SpotifyTrackUri equals t.SpotifyTrackUri
                    where s.SpotifyUserId == spotifyUserId
                    select new { s, t };

        if (startYear.HasValue)
        {
            var startDate = new DateTime(startYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            query = query.Where(x => x.s.PlayedAt >= startDate);
        }
        if (endYear.HasValue)
        {
            var endDate = new DateTime(endYear.Value, 12, 31, 23, 59, 59, DateTimeKind.Utc);
            query = query.Where(x => x.s.PlayedAt <= endDate);
        }

        if (includedArtists != null && includedArtists.Count > 0)
        {
            var artistFilters = includedArtists.Select(a => a.Trim()).ToList();
            query = query.Where(x => artistFilters.Contains(x.t.ArtistName));
        }

        if (excludedArtists != null && excludedArtists.Count > 0)
        {
            var artistFilters = excludedArtists.Select(a => a.Trim()).ToList();
            query = query.Where(x => !artistFilters.Contains(x.t.ArtistName));
        }

        var gQuery = query
            .GroupBy(x => x.s.SpotifyTrackUri)
            .Select(g => new
            {
                TrackUri = g.Key,
                PlayCount = g.Count()
            });

        var orderedQuery = useRandom
            ? gQuery.OrderBy(x => Guid.NewGuid())
            : gQuery.OrderByDescending(x => x.PlayCount);

        var grouped = await orderedQuery
            .Take(trackCount)
            .ToListAsync();

        return grouped.Select(x => x.TrackUri).ToList();
    }

    public async Task<List<int>> GetAvailableYearsAsync(string spotifyUserId)
    {
        return await _context.StreamingRecords
            .Where(r => r.SpotifyUserId == spotifyUserId)
            .Select(r => r.PlayedAt.Year)
            .Distinct()
            .OrderBy(y => y)
            .ToListAsync();
    }

    public async Task<(long TotalMs, int UniqueTracks, int UniqueArtists, string TopArtist, int TopArtistCount)> GetWrappedStatsAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.StreamingRecords.Where(r => r.SpotifyUserId == spotifyUserId);

        if (startDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt <= endDate.Value);
        }

        var totalMs = await query.AnyAsync() ? await query.SumAsync(r => (long)r.MsPlayed) : 0;

        var uniqueTracks = await query.Select(r => r.SpotifyTrackUri).Distinct().CountAsync();

        var uniqueArtists = await query
            .Join(_context.Tracks, r => r.SpotifyTrackUri, t => t.SpotifyTrackUri, (r, t) => t.ArtistName)
            .Distinct()
            .CountAsync();

        var topArtistGroup = await query
            .Join(_context.Tracks, r => r.SpotifyTrackUri, t => t.SpotifyTrackUri, (r, t) => t.ArtistName)
            .GroupBy(artistName => artistName)
            .Select(g => new { ArtistName = g.Key, PlayCount = g.Count() })
            .OrderByDescending(x => x.PlayCount)
            .FirstOrDefaultAsync();

        var topArtist = topArtistGroup?.ArtistName ?? "Bilinmiyor";
        var topArtistCount = topArtistGroup?.PlayCount ?? 0;

        return (totalMs, uniqueTracks, uniqueArtists, topArtist, topArtistCount);
    }

    public async Task<List<(Track Track, int TotalMinutes)>> GetTopTracksPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy)
    {
        var query = _context.StreamingRecords.Where(r => r.SpotifyUserId == spotifyUserId);

        if (startDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt <= endDate.Value);
        }

        var grouped = query
            .Join(_context.Tracks, r => r.SpotifyTrackUri, t => t.SpotifyTrackUri, (r, t) => new { r, t })
            .GroupBy(x => new { x.t.SpotifyTrackUri, x.t.TrackName, x.t.ArtistName, x.t.AlbumName, x.t.ImageUrl })
            .Select(g => new
            {
                SpotifyTrackUri = g.Key.SpotifyTrackUri,
                TrackName = g.Key.TrackName,
                ArtistName = g.Key.ArtistName,
                AlbumName = g.Key.AlbumName,
                ImageUrl = g.Key.ImageUrl,
                PlayCount = g.Count(),
                TotalMs = g.Sum(x => (long)x.r.MsPlayed)
            });

        if (sortBy == "duration")
        {
            grouped = grouped.OrderByDescending(x => x.TotalMs);
        }
        else
        {
            grouped = grouped.OrderByDescending(x => x.PlayCount);
        }

        var results = await grouped
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return results.Select(t => (
            new Track
            {
                SpotifyTrackUri = t.SpotifyTrackUri,
                TrackName = t.TrackName,
                ArtistName = t.ArtistName,
                AlbumName = t.AlbumName,
                PlayCount = t.PlayCount,
                ImageUrl = t.ImageUrl
            },
            (int)(t.TotalMs / 60000)
        )).ToList();
    }

    public async Task<List<(string ArtistName, int PlayCount, int TotalMinutes)>> GetTopArtistsPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy)
    {
        var query = _context.StreamingRecords.Where(r => r.SpotifyUserId == spotifyUserId);

        if (startDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt <= endDate.Value);
        }

        var grouped = query
            .Join(_context.Tracks, r => r.SpotifyTrackUri, t => t.SpotifyTrackUri, (r, t) => new { r, t })
            .GroupBy(x => x.t.ArtistName)
            .Select(g => new
            {
                ArtistName = g.Key,
                PlayCount = g.Count(),
                TotalMs = g.Sum(x => (long)x.r.MsPlayed)
            });

        if (sortBy == "duration")
        {
            grouped = grouped.OrderByDescending(x => x.TotalMs);
        }
        else
        {
            grouped = grouped.OrderByDescending(x => x.PlayCount);
        }

        var results = await grouped
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return results.Select(t => (
            t.ArtistName,
            t.PlayCount,
            (int)(t.TotalMs / 60000)
        )).ToList();
    }

    public async Task<int> GetTopTracksCountAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.StreamingRecords.Where(r => r.SpotifyUserId == spotifyUserId);

        if (startDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt <= endDate.Value);
        }

        return await query.Select(r => r.SpotifyTrackUri).Distinct().CountAsync();
    }

    public async Task<int> GetTopArtistsCountAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.StreamingRecords.Where(r => r.SpotifyUserId == spotifyUserId);

        if (startDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(r => r.PlayedAt <= endDate.Value);
        }

        return await query
            .Join(_context.Tracks, r => r.SpotifyTrackUri, t => t.SpotifyTrackUri, (r, t) => t.ArtistName)
            .Distinct()
            .CountAsync();
    }

    public async Task<List<(string Period, int PlayCount)>> GetTrackPlayHistoryAsync(string spotifyUserId, string trackUri)
    {
        var grouped = await _context.StreamingRecords
            .Where(r => r.SpotifyUserId == spotifyUserId && r.SpotifyTrackUri == trackUri)
            .GroupBy(r => new { Year = r.PlayedAt.Year, Month = r.PlayedAt.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                PlayCount = g.Count()
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        return grouped.Select(x => ($"{x.Year}-{x.Month:D2}", x.PlayCount)).ToList();
    }

    public async Task<List<(string Period, int PlayCount)>> GetArtistPlayHistoryAsync(string spotifyUserId, string artistName)
    {
        var grouped = await _context.StreamingRecords
            .Where(r => r.SpotifyUserId == spotifyUserId)
            .Join(_context.Tracks, r => r.SpotifyTrackUri, t => t.SpotifyTrackUri, (r, t) => new { r, t })
            .Where(x => x.t.ArtistName == artistName)
            .GroupBy(x => new { Year = x.r.PlayedAt.Year, Month = x.r.PlayedAt.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                PlayCount = g.Count()
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        return grouped.Select(x => ($"{x.Year}-{x.Month:D2}", x.PlayCount)).ToList();
    }
}

