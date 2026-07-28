using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Infrastructure.Configuration;

namespace SpotifyAllTime.Infrastructure.Services;

public class SpotifyApiClient : ISpotifyApiClient
{
    private readonly HttpClient _httpClient;
    private readonly SpotifySettings _settings;

    public SpotifyApiClient(HttpClient httpClient, IOptions<SpotifySettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresInSeconds)> AuthenticateWithCodeAsync(string code, string redirectUri)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        
        var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.ClientId}:{_settings.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "authorization_code" },
            { "code", code },
            { "redirect_uri", redirectUri }
        });

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<TokenResponse>();
        return (result!.AccessToken, result.RefreshToken ?? string.Empty, result.ExpiresIn);
    }

    public async Task<(string AccessToken, int ExpiresInSeconds)> RefreshTokenAsync(string refreshToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        
        var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.ClientId}:{_settings.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "refresh_token", refreshToken }
        });

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<TokenResponse>();
        return (result!.AccessToken, result.ExpiresIn);
    }

    public async Task<(string SpotifyUserId, string DisplayName, string Email)> GetUserProfileAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<UserProfileResponse>();
        return (result!.Id, result.DisplayName ?? string.Empty, result.Email ?? string.Empty);
    }

    public async Task<List<(string TrackUri, string TrackName, string ArtistName, string AlbumName, DateTime PlayedAt, int MsPlayed)>> GetRecentlyPlayedAsync(string accessToken, int limit = 50)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/me/player/recently-played?limit={limit}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RecentlyPlayedResponse>();
        var tracks = new List<(string, string, string, string, DateTime, int)>();

        if (result?.Items != null)
        {
            foreach (var item in result.Items)
            {
                if (item.Track != null)
                {
                    var artistName = item.Track.Artists != null && item.Track.Artists.Length > 0 
                        ? item.Track.Artists[0].Name 
                        : "Unknown Artist";
                    var albumName = item.Track.Album != null ? item.Track.Album.Name : "Unknown Album";
                    
                    tracks.Add((
                        item.Track.Uri,
                        item.Track.Name,
                        artistName,
                        albumName,
                        item.PlayedAt.ToUniversalTime(),
                        item.Track.DurationMs
                    ));
                }
            }
        }

        return tracks;
    }

    public async Task ReplacePlaylistItemsAsync(string accessToken, string playlistId, List<string> trackUris)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, $"https://api.spotify.com/v1/playlists/{playlistId}/tracks");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var payload = new { uris = trackUris };
        request.Content = JsonContent.Create(payload);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<(string TrackUri, string TrackName, string ArtistName, string AlbumName)>> GetTracksMetadataAsync(IEnumerable<string> spotifyTrackIds, string accessToken)
    {
        var ids = string.Join(",", spotifyTrackIds);
        var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/tracks?ids={ids}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<SeveralTracksResponse>();
        var tracks = new List<(string, string, string, string)>();

        if (result?.Tracks != null)
        {
            foreach (var track in result.Tracks)
            {
                if (track != null)
                {
                    var artistName = track.Artists != null && track.Artists.Length > 0 
                        ? track.Artists[0].Name 
                        : "Unknown Artist";
                    var albumName = track.Album != null ? track.Album.Name : "Unknown Album";

                    tracks.Add((
                        track.Uri,
                        track.Name,
                        artistName,
                        albumName
                    ));
                }
            }
        }

        return tracks;
    }

    private class SeveralTracksResponse
    {
        [JsonPropertyName("tracks")]
        public List<SpotifyTrack?>? Tracks { get; set; }
    }

    private class TokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }
    }

    private class UserProfileResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("display_name")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }
    }

    private class RecentlyPlayedResponse
    {
        [JsonPropertyName("items")]
        public List<PlayHistoryItem>? Items { get; set; }
    }

    private class PlayHistoryItem
    {
        [JsonPropertyName("track")]
        public SpotifyTrack? Track { get; set; }

        [JsonPropertyName("played_at")]
        public DateTime PlayedAt { get; set; }
    }

    private class SpotifyTrack
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("duration_ms")]
        public int DurationMs { get; set; }

        [JsonPropertyName("artists")]
        public SpotifyArtist[]? Artists { get; set; }

        [JsonPropertyName("album")]
        public SpotifyAlbum? Album { get; set; }
    }

    private class SpotifyArtist
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    private class SpotifyAlbum
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }
}
