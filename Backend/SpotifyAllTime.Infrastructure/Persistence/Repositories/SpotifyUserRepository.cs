using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Infrastructure.Persistence.Repositories;

public class SpotifyUserRepository : ISpotifyUserRepository
{
    private readonly SpotifyDbContext _context;

    public SpotifyUserRepository(SpotifyDbContext context)
    {
        _context = context;
    }

    public async Task<SpotifyUser?> GetByIdAsync(Guid id)
    {
        return await _context.SpotifyUsers.FindAsync(id);
    }

    public async Task<SpotifyUser?> GetBySpotifyIdAsync(string spotifyUserId)
    {
        return await _context.SpotifyUsers
            .FirstOrDefaultAsync(u => u.SpotifyUserId == spotifyUserId);
    }

    public async Task AddAsync(SpotifyUser user)
    {
        await _context.SpotifyUsers.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(SpotifyUser user)
    {
        _context.SpotifyUsers.Update(user);
        await _context.SaveChangesAsync();
    }
}
