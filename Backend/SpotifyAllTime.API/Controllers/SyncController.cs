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
    public async Task<IActionResult> TriggerPlaylistSync(string spotifyUserId)
    {
        var playlistId = await _syncDomainService.SyncTop100PlaylistAsync(spotifyUserId);
        var playlistUrl = $"https://open.spotify.com/playlist/{playlistId}";
        return Ok(new { Message = "Midnight playlist sync triggered and completed successfully.", PlaylistUrl = playlistUrl });
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
            imageUrl = result.Value.ImageUrl 
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
}
