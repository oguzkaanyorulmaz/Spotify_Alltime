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
    Task<List<(string TrackUri, string TrackName, string ArtistName, string AlbumName)>> GetTracksMetadataAsync(IEnumerable<string> spotifyTrackIds, string accessToken);
}
