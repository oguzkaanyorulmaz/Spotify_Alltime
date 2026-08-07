using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SpotifyAllTime.Application.Interfaces;

namespace SpotifyAllTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly IStatsAppService _statsAppService;

    public StatsController(IStatsAppService statsAppService)
    {
        _statsAppService = statsAppService;
    }

    [HttpGet("top-100")]
    public async Task<IActionResult> GetTop100()
    {
        var top100 = await _statsAppService.GetTop100TracksAsync();
        return Ok(top100);
    }

    [HttpGet("wrapped/{spotifyUserId}")]
    public async Task<IActionResult> GetYearlyWrapped(string spotifyUserId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var wrapped = await _statsAppService.GetWrappedStatsAsync(spotifyUserId, startDate, endDate);
        return Ok(wrapped);
    }

    [HttpGet("wrapped/tracks/{spotifyUserId}")]
    public async Task<IActionResult> GetYearlyWrappedTracks(
        string spotifyUserId, 
        [FromQuery] DateTime? startDate, 
        [FromQuery] DateTime? endDate, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50, 
        [FromQuery] string sortBy = "playcount",
        [FromQuery] string? search = null)
    {
        var result = await _statsAppService.GetTopTracksPagedAsync(spotifyUserId, startDate, endDate, page, pageSize, sortBy, search);
        return Ok(result);
    }

    [HttpGet("wrapped/artists/{spotifyUserId}")]
    public async Task<IActionResult> GetYearlyWrappedArtists(
        string spotifyUserId, 
        [FromQuery] DateTime? startDate, 
        [FromQuery] DateTime? endDate, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10, 
        [FromQuery] string sortBy = "playcount")
    {
        var result = await _statsAppService.GetTopArtistsPagedAsync(spotifyUserId, startDate, endDate, page, pageSize, sortBy);
        return Ok(result);
    }

    [HttpGet("history/track/{spotifyUserId}")]
    public async Task<IActionResult> GetTrackPlayHistory(string spotifyUserId, [FromQuery] string trackUri)
    {
        var result = await _statsAppService.GetTrackPlayHistoryAsync(spotifyUserId, trackUri);
        return Ok(result);
    }

    [HttpGet("history/artist/{spotifyUserId}")]
    public async Task<IActionResult> GetArtistPlayHistory(string spotifyUserId, [FromQuery] string artistName)
    {
        var result = await _statsAppService.GetArtistPlayHistoryAsync(spotifyUserId, artistName);
        return Ok(result);
    }

    [HttpGet("track-image/{spotifyUserId}/{trackId}")]
    public async Task<IActionResult> GetLazyTrackImage(string spotifyUserId, string trackId)
    {
        var imageUrl = await _statsAppService.GetLazyTrackImageAsync(spotifyUserId, trackId);
        return Ok(new { imageUrl });
    }

    [HttpGet("artist-image/{spotifyUserId}/{artistName}")]
    public async Task<IActionResult> GetLazyArtistImage(string spotifyUserId, string artistName)
    {
        var imageUrl = await _statsAppService.GetLazyArtistImageAsync(spotifyUserId, artistName);
        return Ok(new { imageUrl });
    }

    [HttpGet("test-users")]
    public async Task<IActionResult> GetTestUsers()
    {
        var context = HttpContext.RequestServices.GetRequiredService<SpotifyAllTime.Infrastructure.Persistence.SpotifyDbContext>();
        var users = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(context.SpotifyUsers);
        return Ok(users.Select(u => new { u.SpotifyUserId, u.DisplayName }));
    }
}

