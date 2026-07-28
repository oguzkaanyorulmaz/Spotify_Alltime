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
}
