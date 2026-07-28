using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SpotifyAllTime.Domain.Interfaces.DomainServices;

namespace SpotifyAllTime.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly ISpotifySyncDomainService _syncDomainService;
    private readonly IMetadataEnrichmentDomainService _metadataEnrichmentService;

    public SyncController(
        ISpotifySyncDomainService syncDomainService,
        IMetadataEnrichmentDomainService metadataEnrichmentService)
    {
        _syncDomainService = syncDomainService;
        _metadataEnrichmentService = metadataEnrichmentService;
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
        await _syncDomainService.SyncTop100PlaylistAsync(spotifyUserId);
        return Ok(new { Message = "Midnight playlist sync triggered and completed successfully." });
    }

    [HttpPost("enrich/{spotifyUserId}")]
    public async Task<IActionResult> TriggerMetadataEnrichment(string spotifyUserId, [FromQuery] int count = 500)
    {
        await _metadataEnrichmentService.EnrichTopTracksAsync(spotifyUserId, count);
        return Ok(new { Message = $"Metadata enrichment triggered and completed successfully for top {count} tracks." });
    }
}
