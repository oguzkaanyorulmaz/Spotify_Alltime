using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SpotifyAllTime.Application.Interfaces;

namespace SpotifyAllTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISpotifyUserAppService _userAppService;

    public AuthController(ISpotifyUserAppService userAppService)
    {
        _userAppService = userAppService;
    }

    [HttpGet("login-url")]
    public IActionResult GetLoginUrl([FromQuery] string clientId, [FromQuery] string redirectUri)
    {
        var scopes = "user-read-private user-read-email user-read-recently-played playlist-modify-public playlist-modify-private";
        var url = $"https://accounts.spotify.com/authorize?response_type=code&client_id={clientId}&scope={System.Web.HttpUtility.UrlEncode(scopes)}&redirect_uri={System.Web.HttpUtility.UrlEncode(redirectUri)}";
        
        return Ok(new { Url = url });
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
