using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SpotifyAllTime.Application.Interfaces;

namespace SpotifyAllTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IngestionController : ControllerBase
{
    private readonly IHistoryIngestionAppService _ingestionAppService;

    public IngestionController(IHistoryIngestionAppService ingestionAppService)
    {
        _ingestionAppService = ingestionAppService;
    }

    [HttpPost("upload/{spotifyUserId}")]
    public async Task<IActionResult> UploadHistory(string spotifyUserId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Lutfen gecerli bir JSON dosyasi yukleyin.");
        }

        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        var jsonContent = await reader.ReadToEndAsync();

        var result = await _ingestionAppService.ImportHistoryAsync(spotifyUserId, jsonContent);
        return Ok(result);
    }
}
