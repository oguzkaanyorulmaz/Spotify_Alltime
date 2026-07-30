using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SpotifyAllTime.Domain.Interfaces.Abstractions;

public interface ISpotifyApiClient
{
    Task<(string AccessToken, string RefreshToken, int ExpiresInSeconds)> AuthenticateWithCodeAsync(string code, string redirectUri);
    Task<(string AccessToken, int ExpiresInSeconds)> RefreshTokenAsync(string refreshToken);
    Task<(string SpotifyUserId, string DisplayName, string Email)> GetUserProfileAsync(string accessToken);
    Task<List<(string TrackUri, string TrackName, string ArtistName, string AlbumName, DateTime PlayedAt, int MsPlayed)>> GetRecentlyPlayedAsync(string accessToken, int limit = 50);
    Task ReplacePlaylistItemsAsync(string accessToken, string playlistId, List<string> trackUris);
    Task<List<(string TrackUri, string TrackName, string ArtistName, string ArtistId, string AlbumName)>> GetTracksMetadataAsync(IEnumerable<string> spotifyTrackIds, string accessToken);
    Task<Dictionary<string, List<string>>> GetArtistsGenresAsync(IEnumerable<string> artistIds, string accessToken);
    Task<string> CreatePlaylistAsync(string accessToken, string spotifyUserId, string name);
    Task<(string? ImageUrl, List<string> Genres)> GetArtistDetailsAsync(string artistName, string accessToken);
    Task<(bool IsPlaying, string Title, string Artist, string Album, string? ImageUrl)?> GetCurrentlyPlayingAsync(string accessToken);
    Task<List<(string TrackUri, string? ImageUrl)>> GetTrackImagesAsync(IEnumerable<string> spotifyTrackIds, string accessToken);
}
