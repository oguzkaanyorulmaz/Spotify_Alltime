using System.Collections.Generic;
using System.Threading.Tasks;

namespace SpotifyAllTime.Domain.Interfaces.DomainServices;

public interface ISpotifySyncDomainService
{
    Task SyncRecentlyPlayedAsync(string spotifyUserId);
    Task<string> SyncTop100PlaylistAsync(string spotifyUserId);
    Task<(bool IsPlaying, string Title, string Artist, string Album, string? ImageUrl)?> GetCurrentlyPlayingAsync(string spotifyUserId);
    Task<string> SyncCustomPlaylistAsync(string spotifyUserId, string playlistName, int? startYear, int? endYear, List<string>? includedArtists, List<string>? excludedArtists, int trackCount, bool fillMissing, bool useRandom);
    Task<List<int>> GetAvailableYearsAsync(string spotifyUserId);
}
