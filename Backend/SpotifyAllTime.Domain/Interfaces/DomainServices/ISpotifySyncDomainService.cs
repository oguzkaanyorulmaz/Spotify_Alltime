using System.Threading.Tasks;

namespace SpotifyAllTime.Domain.Interfaces.DomainServices;

public interface ISpotifySyncDomainService
{
    Task SyncRecentlyPlayedAsync(string spotifyUserId);
    Task SyncTop100PlaylistAsync(string spotifyUserId);
}
