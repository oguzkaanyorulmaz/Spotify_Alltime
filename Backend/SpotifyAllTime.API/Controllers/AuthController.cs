using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SpotifyAllTime.Application.Interfaces;

using Microsoft.Extensions.Options;
using SpotifyAllTime.Infrastructure.Configuration;

namespace SpotifyAllTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISpotifyUserAppService _userAppService;
    private readonly SpotifySettings _settings;

    public AuthController(ISpotifyUserAppService userAppService, IOptions<SpotifySettings> settings)
    {
        _userAppService = userAppService;
        _settings = settings.Value;
    }

    [HttpGet("login-url")]
    public IActionResult GetLoginUrl([FromQuery] string redirectUri)
    {
        var scopes = "user-read-private user-read-email user-read-recently-played user-read-currently-playing user-read-playback-state playlist-modify-public playlist-modify-private user-modify-playback-state playlist-read-private playlist-read-collaborative";
        var url = $"https://accounts.spotify.com/authorize?response_type=code&client_id={_settings.ClientId}&scope={Uri.EscapeDataString(scopes)}&redirect_uri={Uri.EscapeDataString(redirectUri)}&show_dialog=true";
        
        return Ok(new { loginUrl = url });
    }

    [HttpPost("callback")]
    public async Task<IActionResult> Callback([FromBody] CallbackRequest request)
    {
        if (string.IsNullOrEmpty(request.Code) || string.IsNullOrEmpty(request.RedirectUri))
        {
            return BadRequest("Code and RedirectUri are required.");
        }

        var userDto = await _userAppService.RegisterOrUpdateUserAsync(request.Code, request.RedirectUri);
        return Ok(userDto);
    }

    [HttpPost("set-playlist")]
    public async Task<IActionResult> SetPlaylist([FromBody] SetPlaylistRequest request)
    {
        await _userAppService.SetTargetPlaylistAsync(request.SpotifyUserId, request.PlaylistId);
        return Ok(new { Message = "Playlist ID updated successfully." });
    }

    public class CallbackRequest
    {
        public string Code { get; set; } = string.Empty;
        public string RedirectUri { get; set; } = string.Empty;
    }

    public class SetPlaylistRequest
    {
        public string SpotifyUserId { get; set; } = string.Empty;
        public string PlaylistId { get; set; } = string.Empty;
    }
}
