using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Domain.Interfaces.DomainServices;

namespace SpotifyAllTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly ISpotifySyncDomainService _syncDomainService;

    public SyncController(ISpotifySyncDomainService syncDomainService)
    {
        _syncDomainService = syncDomainService;
    }

    [HttpPost("recently-played/{spotifyUserId}")]
    public async Task<IActionResult> TriggerRecentlyPlayedSync(string spotifyUserId)
    {
        await _syncDomainService.SyncRecentlyPlayedAsync(spotifyUserId);
        return Ok(new { Message = "Recently played sync triggered and completed successfully." });
    }

    [HttpPost("playlist/{spotifyUserId}")]
    public async Task<IActionResult> TriggerPlaylistSync(
        string spotifyUserId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var playlistId = await _syncDomainService.SyncTop100PlaylistAsync(spotifyUserId, startDate, endDate);
        var playlistUrl = $"https://open.spotify.com/playlist/{playlistId}";
        return Ok(new { Message = "Playlist sync triggered and completed successfully.", PlaylistUrl = playlistUrl });
    }

    [HttpGet("currently-playing/{spotifyUserId}")]
    public async Task<IActionResult> GetCurrentlyPlaying(string spotifyUserId)
    {
        var result = await _syncDomainService.GetCurrentlyPlayingAsync(spotifyUserId);
        if (result == null) return NotFound("Currently playing data not found.");
        return Ok(new 
        { 
            isPlaying = result.Value.IsPlaying, 
            title = result.Value.Title, 
            artist = result.Value.Artist, 
            album = result.Value.Album, 
            imageUrl = result.Value.ImageUrl,
            queue = result.Value.Queue.Select(q => new
            {
                spotifyTrackId = q.SpotifyTrackUri.StartsWith("spotify:track:") ? q.SpotifyTrackUri.Substring("spotify:track:".Length) : q.SpotifyTrackUri,
                title = q.Title,
                artist = q.Artist,
                imageUrl = q.ImageUrl
            }).ToList(),
            previous = result.Value.Previous == null ? null : new
            {
                spotifyTrackId = result.Value.Previous.SpotifyTrackUri.StartsWith("spotify:track:") ? result.Value.Previous.SpotifyTrackUri.Substring("spotify:track:".Length) : result.Value.Previous.SpotifyTrackUri,
                title = result.Value.Previous.Title,
                artist = result.Value.Previous.Artist,
                imageUrl = result.Value.Previous.ImageUrl
            }
        });
    }

    [HttpPost("custom-playlist/{spotifyUserId}")]
    public async Task<IActionResult> CreateCustomPlaylist(string spotifyUserId, [FromBody] CustomPlaylistRequest request)
    {
        try
        {
            var playlistId = await _syncDomainService.SyncCustomPlaylistAsync(
                spotifyUserId,
                request.PlaylistName,
                request.StartYear,
                request.EndYear,
                request.IncludedArtists,
                request.ExcludedArtists,
                request.TrackCount,
                request.FillMissing,
                request.UseRandom
            );
            var playlistUrl = $"https://open.spotify.com/playlist/{playlistId}";
            return Ok(new { Message = "Custom playlist created successfully.", PlaylistUrl = playlistUrl });
        }
        catch (System.Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpGet("available-years/{spotifyUserId}")]
    public async Task<IActionResult> GetAvailableYears(string spotifyUserId)
    {
        var years = await _syncDomainService.GetAvailableYearsAsync(spotifyUserId);
        return Ok(years);
    }

    [HttpPost("player/next/{spotifyUserId}")]
    public async Task<IActionResult> NextTrack(string spotifyUserId)
    {
        await _syncDomainService.NextTrackAsync(spotifyUserId);
        return Ok(new { Message = "Next track skip triggered." });
    }

    [HttpPost("player/previous/{spotifyUserId}")]
    public async Task<IActionResult> PreviousTrack(string spotifyUserId)
    {
        await _syncDomainService.PreviousTrackAsync(spotifyUserId);
        return Ok(new { Message = "Previous track skip triggered." });
    }

    [HttpPost("player/pause/{spotifyUserId}")]
    public async Task<IActionResult> PausePlayback(string spotifyUserId)
    {
        await _syncDomainService.PausePlaybackAsync(spotifyUserId);
        return Ok(new { Message = "Playback paused." });
    }

    [HttpPost("player/resume/{spotifyUserId}")]
    public async Task<IActionResult> ResumePlayback(string spotifyUserId)
    {
        await _syncDomainService.ResumePlaybackAsync(spotifyUserId);
        return Ok(new { Message = "Playback resumed." });
    }

    [HttpPost("player/play/{spotifyUserId}")]
    public async Task<IActionResult> PlayTrack(string spotifyUserId, [FromQuery] string trackUri)
    {
        await _syncDomainService.PlayTrackAsync(spotifyUserId, trackUri);
        return Ok(new { Message = "Playback started." });
    }

    [HttpGet("playlists/{spotifyUserId}")]
    public async Task<IActionResult> GetUserPlaylists(string spotifyUserId)
    {
        try
        {
            var playlists = await _syncDomainService.GetUserPlaylistsAsync(spotifyUserId);
            return Ok(playlists);
        }
        catch (System.Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }
}
