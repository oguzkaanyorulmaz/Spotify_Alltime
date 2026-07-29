using System.Collections.Generic;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Entities;

namespace SpotifyAllTime.Domain.Interfaces.Repositories;

public interface ITrackRepository
{
    Task<Track?> GetByUriAsync(string trackUri);
    Task AddAsync(Track track);
    Task UpdateAsync(Track track);
    Task BulkAddOrUpdateAsync(IEnumerable<Track> tracks);
    Task<List<Track>> GetTopTracksAsync(int count);
    Task RecalculateTrackPlayCountsAsync();
}
