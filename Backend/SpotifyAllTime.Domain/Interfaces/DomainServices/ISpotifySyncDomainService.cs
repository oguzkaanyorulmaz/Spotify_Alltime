using System.Collections.Generic;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Interfaces.Abstractions;

namespace SpotifyAllTime.Domain.Interfaces.DomainServices;

public interface ISpotifySyncDomainService
{
    Task SyncRecentlyPlayedAsync(string spotifyUserId);
    Task<string> SyncTop100PlaylistAsync(string spotifyUserId, System.DateTime? startDate = null, System.DateTime? endDate = null);
    Task<(bool IsPlaying, string Title, string Artist, string Album, string? ImageUrl, List<QueueItemDto> Queue, QueueItemDto? Previous)?> GetCurrentlyPlayingAsync(string spotifyUserId);
    Task<string> SyncCustomPlaylistAsync(string spotifyUserId, string playlistName, int? startYear, int? endYear, List<string>? includedArtists, List<string>? excludedArtists, int trackCount, bool fillMissing, bool useRandom);
    Task<List<int>> GetAvailableYearsAsync(string spotifyUserId);
    Task NextTrackAsync(string spotifyUserId);
    Task PreviousTrackAsync(string spotifyUserId);
    Task PausePlaybackAsync(string spotifyUserId);
    Task ResumePlaybackAsync(string spotifyUserId);
    Task PlayTrackAsync(string spotifyUserId, string trackUri);
    Task<List<SpotifyPlaylistDto>> GetUserPlaylistsAsync(string spotifyUserId);
}
