using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
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

    public async Task<List<(string TrackUri, string TrackName, string ArtistName, string AlbumName, DateTime PlayedAt, int MsPlayed, string? ImageUrl)>> GetRecentlyPlayedAsync(string accessToken, int limit = 50)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/me/player/recently-played?limit={limit}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RecentlyPlayedResponse>();
        var tracks = new List<(string, string, string, string, DateTime, int, string?)>();

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
                    var imageUrl = item.Track.Album?.Images != null && item.Track.Album.Images.Length > 0
                        ? item.Track.Album.Images[0].Url
                        : null;
                    
                    tracks.Add((
                        item.Track.Uri,
                        item.Track.Name,
                        artistName,
                        albumName,
                        item.PlayedAt.ToUniversalTime(),
                        item.Track.DurationMs,
                        imageUrl
                    ));
                }
            }
        }

        return tracks;
    }

    private async Task<string?> GetTrackImageFromEmbedAsync(string trackId)
    {
        try
        {
            var url = $"https://open.spotify.com/embed/track/{trackId}";
            var response = await _httpClient.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var html = await response.Content.ReadAsStringAsync();
                
                // Regex to find any spotifycdn image url (e.g. image-cdn-ak, image-cdn-fa etc.)
                var match = Regex.Match(html, @"https://[a-zA-Z0-9.-]*spotifycdn\.com/image/[a-zA-Z0-9]+");
                if (match.Success)
                {
                    return match.Value;
                }
                
                // Fallback to scdn.co
                var matchScdn = Regex.Match(html, @"https://i\.scdn\.co/image/[a-zA-Z0-9]+");
                if (matchScdn.Success)
                {
                    return matchScdn.Value;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SpotifyApiClient] Embed fallback parse failed for track {trackId}: {ex.Message}");
        }
        return null;
    }

    public async Task<List<(string TrackUri, string? ImageUrl)>> GetTrackImagesAsync(IEnumerable<string> spotifyTrackIds, string accessToken)
    {
        var resultList = new List<(string, string?)>();
        var distinctIds = spotifyTrackIds.Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
        Console.WriteLine($"[SpotifyApiClient] GetTrackImagesAsync called with {distinctIds.Count} track IDs");
        if (!distinctIds.Any()) return resultList;

        for (int i = 0; i < distinctIds.Count; i += 50)
        {
            var chunk = distinctIds.Skip(i).Take(50).ToList();
            var idsParam = string.Join(",", chunk);
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/tracks?ids={idsParam}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.SendAsync(request);
                Console.WriteLine($"[SpotifyApiClient] Spotify API GET /v1/tracks response status: {response.StatusCode}");
                if (response.IsSuccessStatusCode)
                {
                    var responseObj = await response.Content.ReadFromJsonAsync<SeveralTracksResponse>();
                    if (responseObj?.Tracks != null)
                    {
                        Console.WriteLine($"[SpotifyApiClient] Spotify API returned {responseObj.Tracks.Count} tracks in response");
                        foreach (var track in responseObj.Tracks)
                        {
                            if (track != null)
                            {
                                var imageUrl = track.Album?.Images != null && track.Album.Images.Length > 0
                                    ? track.Album.Images[0].Url
                                    : null;
                                resultList.Add((track.Uri, imageUrl));
                            }
                        }
                    }
                    else
                    {
                        Console.WriteLine("[SpotifyApiClient] responseObj or Tracks list was null!");
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    Console.WriteLine("[SpotifyApiClient] Spotify API returned 403 Forbidden. Using public oEmbed/Embed fallback scraping...");
                    foreach (var trackId in chunk)
                    {
                        var imgUrl = await GetTrackImageFromEmbedAsync(trackId);
                        if (!string.IsNullOrEmpty(imgUrl))
                        {
                            resultList.Add(($"spotify:track:{trackId}", imgUrl));
                        }
                    }
                }
                else
                {
                    var errBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[SpotifyApiClient] Error response body: {errBody}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SpotifyApiClient] Batch track fetch failed: {ex.Message}");
            }
        }

        Console.WriteLine($"[SpotifyApiClient] GetTrackImagesAsync returning {resultList.Count} track images");
        return resultList;
    }

    public async Task<(string? ImageUrl, List<string> Genres)> GetArtistDetailsAsync(string artistName, string accessToken)
    {
        var genres = new List<string>();
        try
        {
            // Spotify Arama API'sini kullanarak sanatçının bilgilerini ve profil görselini çekiyoruz (limit=5 yaparak arama algoritmik sapmalarını engelliyoruz)
            var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(artistName)}&type=artist&limit=5");
            Console.WriteLine($"[SpotifyApiClient] Requesting URL: {request.RequestUri}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await _httpClient.SendAsync(request);
            Console.WriteLine($"[SpotifyApiClient] Search response status for '{artistName}': {response.StatusCode}");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var result = System.Text.Json.JsonSerializer.Deserialize<SpotifyArtistSearchResponse>(json);
                var items = result?.Artists?.Items;
                SpotifyArtistDetail? artist = null;
                if (items != null && items.Count > 0)
                {
                    // Tam isim eşleşmesi (büyük/küçük harf duyarsız) arıyoruz
                    artist = items.FirstOrDefault(i => string.Equals(i.Name, artistName, StringComparison.OrdinalIgnoreCase))
                             ?? items[0];
                }
                Console.WriteLine($"[SpotifyApiClient] Search result for '{artistName}': Selected Artist ID: {artist?.Id}, Name: {artist?.Name}, Images count: {artist?.Images?.Length ?? 0}");
                if (artist != null)
                {
                    if (artist.Genres != null)
                    {
                        genres = artist.Genres;
                    }
                    string? imageUrl = null;
                    if (artist.Images != null && artist.Images.Length > 0)
                    {
                        imageUrl = artist.Images[0].Url;
                        Console.WriteLine($"[SpotifyApiClient] Selected Image URL for '{artistName}': {imageUrl}");
                    }
                    return (imageUrl, genres);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SpotifyApiClient] Search artist details failed for '{artistName}': {ex.Message}");
        }
        return (null, genres);
    }

    public async Task ReplacePlaylistItemsAsync(string accessToken, string playlistId, List<string> trackUris)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, $"https://api.spotify.com/v1/playlists/{playlistId}/items");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var payload = new { uris = trackUris };
        request.Content = JsonContent.Create(payload);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<(string TrackUri, string TrackName, string ArtistName, string ArtistId, string AlbumName)>> GetTracksMetadataAsync(IEnumerable<string> spotifyTrackIds, string accessToken)
    {
        var tracks = new List<(string, string, string, string, string)>();
        var distinctIds = spotifyTrackIds.Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();

        if (!distinctIds.Any()) return tracks;

        var tasks = distinctIds.Select(async id =>
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/tracks/{id}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var track = await response.Content.ReadFromJsonAsync<SpotifyTrack>();
                    if (track != null)
                    {
                        var artistName = track.Artists != null && track.Artists.Length > 0 
                            ? track.Artists[0].Name 
                            : "Unknown Artist";
                        var artistId = track.Artists != null && track.Artists.Length > 0 
                            ? track.Artists[0].Id 
                            : string.Empty;
                        var albumName = track.Album != null ? track.Album.Name : "Unknown Album";

                        lock (tracks)
                        {
                            tracks.Add((track.Uri, track.Name, artistName, artistId, albumName));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SpotifyApiClient] Single track fetch failed for ID {id}: {ex.Message}");
            }
        });

        await Task.WhenAll(tasks);
        return tracks;
    }

    public async Task<Dictionary<string, List<string>>> GetArtistsGenresAsync(IEnumerable<string> artistIds, string accessToken)
    {
        var resultGenres = new Dictionary<string, List<string>>();
        var distinctIds = artistIds.Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();

        if (!distinctIds.Any()) return resultGenres;

        var tasks = distinctIds.Select(async id =>
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/artists/{id}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var artist = await response.Content.ReadFromJsonAsync<SpotifyArtistDetail>();
                    if (artist != null)
                    {
                        lock (resultGenres)
                        {
                            resultGenres[artist.Id] = artist.Genres ?? new List<string>();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SpotifyApiClient] Single artist fetch failed for ID {id}: {ex.Message}");
            }
        });

        await Task.WhenAll(tasks);
        return resultGenres;
    }

    public async Task<string> CreatePlaylistAsync(string accessToken, string spotifyUserId, string name)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.spotify.com/v1/me/playlists");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var payload = new 
        { 
            name = name, 
            description = "My True All-Time Top 100 tracks generated by Music History Analyzer.", 
            @public = false 
        };
        request.Content = JsonContent.Create(payload);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<CreatePlaylistResponse>();
        return result!.Id;
    }

    public async Task<(bool IsPlaying, string Title, string Artist, string Album, string? ImageUrl)?> GetCurrentlyPlayingAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/player/currently-playing");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
        {
            return await GetLastPlayedAsync(accessToken);
        }

        if (!response.IsSuccessStatusCode) return null;

        var result = await response.Content.ReadFromJsonAsync<CurrentlyPlayingResponse>();
        if (result == null || result.Item == null)
        {
            return await GetLastPlayedAsync(accessToken);
        }

        var artistName = result.Item.Artists != null && result.Item.Artists.Length > 0 
            ? string.Join(", ", result.Item.Artists.Select(a => a.Name)) 
            : "Unknown Artist";

        var imageUrl = result.Item.Album?.Images != null && result.Item.Album.Images.Length > 0
            ? result.Item.Album.Images[0].Url
            : null;

        return (result.IsPlaying, result.Item.Name, artistName, result.Item.Album?.Name ?? string.Empty, imageUrl);
    }

    private async Task<(bool IsPlaying, string Title, string Artist, string Album, string? ImageUrl)?> GetLastPlayedAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/player/recently-played?limit=1");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;

        var result = await response.Content.ReadFromJsonAsync<RecentlyPlayedResponse>();
        if (result == null || result.Items == null || result.Items.Count == 0) return null;

        var lastItem = result.Items[0];
        if (lastItem.Track == null) return null;

        var artistName = lastItem.Track.Artists != null && lastItem.Track.Artists.Length > 0 
            ? string.Join(", ", lastItem.Track.Artists.Select(a => a.Name)) 
            : "Unknown Artist";

        var imageUrl = lastItem.Track.Album?.Images != null && lastItem.Track.Album.Images.Length > 0
            ? lastItem.Track.Album.Images[0].Url
            : null;

        return (false, lastItem.Track.Name, artistName, lastItem.Track.Album?.Name ?? string.Empty, imageUrl);
    }

    public async Task NextTrackAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.spotify.com/v1/me/player/next");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Spotify Player API error (NextTrack) returned status {response.StatusCode}: {content}");
        }
    }

    public async Task PreviousTrackAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.spotify.com/v1/me/player/previous");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Spotify Player API error (PreviousTrack) returned status {response.StatusCode}: {content}");
        }
    }

    public async Task ResumePlaybackAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, "https://api.spotify.com/v1/me/player/play");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Spotify Player API error (ResumePlayback) returned status {response.StatusCode}: {content}");
        }
    }

    public async Task PausePlaybackAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, "https://api.spotify.com/v1/me/player/pause");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Spotify Player API error (PausePlayback) returned status {response.StatusCode}: {content}");
        }
    }

    public async Task PlayTrackAsync(string accessToken, string trackUri)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, "https://api.spotify.com/v1/me/player/play");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var payload = new { uris = new[] { trackUri } };
        request.Content = JsonContent.Create(payload);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Spotify Player API error (PlayTrack) returned status {response.StatusCode}: {content}");
        }
    }

    public async Task<List<QueueItemDto>> GetPlaybackQueueAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/player/queue");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return new List<QueueItemDto>();
        }

        var jsonString = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(jsonString);
        var root = document.RootElement;
        
        var list = new List<QueueItemDto>();
        if (root.TryGetProperty("queue", out var queueElement) && queueElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in queueElement.EnumerateArray())
            {
                var title = item.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                var uri = item.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() ?? "" : "";
                
                var artist = "";
                if (item.TryGetProperty("artists", out var artistsProp) && artistsProp.ValueKind == JsonValueKind.Array)
                {
                    var artistNames = new List<string>();
                    foreach (var art in artistsProp.EnumerateArray())
                    {
                        if (art.TryGetProperty("name", out var artNameProp))
                        {
                            artistNames.Add(artNameProp.GetString() ?? "");
                        }
                    }
                    artist = string.Join(", ", artistNames);
                }

                var imageUrl = "";
                if (item.TryGetProperty("album", out var albumProp) && albumProp.TryGetProperty("images", out var imagesProp) && imagesProp.ValueKind == JsonValueKind.Array && imagesProp.GetArrayLength() > 0)
                {
                    var firstImage = imagesProp[0];
                    if (firstImage.TryGetProperty("url", out var urlProp))
                    {
                        imageUrl = urlProp.GetString() ?? "";
                    }
                }

                list.Add(new QueueItemDto
                {
                    SpotifyTrackUri = uri,
                    Title = title,
                    Artist = artist,
                    ImageUrl = imageUrl
                });
            }
        }
        return list;
    }

    public async Task<List<SpotifyPlaylistDto>> GetUserPlaylistsAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/playlists?limit=50");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var responseString = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"[SpotifyApiClient] Playlists raw: {responseString}");
        var result = JsonSerializer.Deserialize<PlaylistsResponse>(responseString);
        var playlistsList = new List<SpotifyPlaylistDto>();

        if (result?.Items != null)
        {
            foreach (var item in result.Items)
            {
                var imageUrl = item.Images != null && item.Images.Length > 0
                    ? item.Images[0].Url
                    : null;

                playlistsList.Add(new SpotifyPlaylistDto
                {
                    Id = item.Id,
                    Name = item.Name,
                    ImageUrl = imageUrl,
                    ExternalUrl = item.ExternalUrls?.Spotify ?? string.Empty,
                    TrackCount = item.Tracks?.Total ?? 0,
                    OwnerName = item.Owner?.DisplayName ?? string.Empty
                });
            }
        }

        return playlistsList;
    }


    private class CreatePlaylistResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
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
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    private class SeveralArtistsResponse
    {
        [JsonPropertyName("artists")]
        public List<SpotifyArtistDetail?>? Artists { get; set; }
    }

    private class SpotifyArtistDetail
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("genres")]
        public List<string>? Genres { get; set; }

        [JsonPropertyName("images")]
        public SpotifyImage[]? Images { get; set; }
    }

    private class SpotifyArtistSearchResponse
    {
        [JsonPropertyName("artists")]
        public SpotifyArtistSearchContainer? Artists { get; set; }
    }

    private class SpotifyArtistSearchContainer
    {
        [JsonPropertyName("items")]
        public List<SpotifyArtistDetail>? Items { get; set; }
    }

    private class SpotifyAlbum
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public SpotifyImage[]? Images { get; set; }
    }

    private class SpotifyImage
    {
        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;
    }

    private class CurrentlyPlayingResponse
    {
        [JsonPropertyName("is_playing")]
        public bool IsPlaying { get; set; }

        [JsonPropertyName("item")]
        public SpotifyTrack? Item { get; set; }
    }

    private class PlaylistsResponse
    {
        [JsonPropertyName("items")]
        public List<SpotifyPlaylist>? Items { get; set; }
    }

    private class SpotifyPlaylist
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public SpotifyImage[]? Images { get; set; }

        [JsonPropertyName("external_urls")]
        public SpotifyExternalUrls? ExternalUrls { get; set; }

        [JsonPropertyName("items")]
        public SpotifyPlaylistTracks? Tracks { get; set; }

        [JsonPropertyName("owner")]
        public SpotifyPlaylistOwner? Owner { get; set; }
    }

    private class SpotifyExternalUrls
    {
        [JsonPropertyName("spotify")]
        public string Spotify { get; set; } = string.Empty;
    }

    private class SpotifyPlaylistTracks
    {
        [JsonPropertyName("total")]
        public int Total { get; set; }
    }

    private class SpotifyPlaylistOwner
    {
        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; } = string.Empty;
    }
}
