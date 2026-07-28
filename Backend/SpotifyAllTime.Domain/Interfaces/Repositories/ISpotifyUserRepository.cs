using System;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Entities;

namespace SpotifyAllTime.Domain.Interfaces.Repositories;

public interface ISpotifyUserRepository
{
    Task<SpotifyUser?> GetByIdAsync(Guid id);
    Task<SpotifyUser?> GetBySpotifyIdAsync(string spotifyUserId);
    Task AddAsync(SpotifyUser user);
    Task UpdateAsync(SpotifyUser user);
}
