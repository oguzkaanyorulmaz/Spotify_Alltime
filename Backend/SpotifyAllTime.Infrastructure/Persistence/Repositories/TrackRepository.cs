using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Infrastructure.Persistence.Repositories;

public class TrackRepository : ITrackRepository
{
    private readonly SpotifyDbContext _context;

    public TrackRepository(SpotifyDbContext context)
    {
        _context = context;
    }

    public async Task<Track?> GetByUriAsync(string trackUri)
    {
        return await _context.Tracks.FindAsync(trackUri);
    }

    public async Task AddAsync(Track track)
    {
        await _context.Tracks.AddAsync(track);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Track track)
    {
        _context.Tracks.Update(track);
        await _context.SaveChangesAsync();
    }

    public async Task BulkAddOrUpdateAsync(IEnumerable<Track> tracks)
    {
        foreach (var track in tracks)
        {
            var existing = await _context.Tracks.FindAsync(track.SpotifyTrackUri);
            if (existing != null)
            {
                existing.TrackName = track.TrackName;
                existing.ArtistName = track.ArtistName;
                existing.AlbumName = track.AlbumName;
                existing.PlayCount = track.PlayCount;
            }
            else
            {
                await _context.Tracks.AddAsync(track);
            }
        }
        await _context.SaveChangesAsync();
    }

    public async Task<List<Track>> GetTopTracksAsync(int count)
    {
        // 1. Veri tabanında gruplayıp toplamları hesapla (SQL tarafında hızlıca çalışır)
        var groupedResult = await _context.Tracks
            .GroupBy(t => new { t.TrackName, t.ArtistName })
            .Select(g => new
            {
                TrackName = g.Key.TrackName,
                ArtistName = g.Key.ArtistName,
                PlayCount = g.Sum(x => x.PlayCount),
                // Çeviri hatası almamak için basit SQL fonksiyonları (MAX) kullanıyoruz:
                SpotifyTrackUri = g.Max(x => x.SpotifyTrackUri),
                AlbumName = g.Max(x => x.AlbumName)
            })
            .OrderByDescending(t => t.PlayCount)
            .Take(count)
            .ToListAsync();

        // 2. Sonucu domain modelimize (Track) eşleyip geri döndür
        return groupedResult.Select(t => new Track
        {
            SpotifyTrackUri = t.SpotifyTrackUri,
            TrackName = t.TrackName,
            ArtistName = t.ArtistName,
            AlbumName = t.AlbumName ?? string.Empty,
            PlayCount = t.PlayCount
        }).ToList();
    }
}
