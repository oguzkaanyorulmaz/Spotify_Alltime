using System.Threading.Tasks;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Domain.Interfaces.DomainServices;

namespace SpotifyAllTime.Application.Services;

public class HistoryIngestionAppService : IHistoryIngestionAppService
{
    private readonly IHistoryIngestionDomainService _historyIngestionDomainService;

    public HistoryIngestionAppService(IHistoryIngestionDomainService historyIngestionDomainService)
    {
        _historyIngestionDomainService = historyIngestionDomainService;
    }

    public async Task<HistoryImportResultDto> ImportHistoryAsync(string spotifyUserId, string jsonContent)
    {
        var (importedCount, skippedCount) = await _historyIngestionDomainService.IngestHistoryJsonAsync(spotifyUserId, jsonContent);
        return new HistoryImportResultDto
        {
            ImportedCount = importedCount,
            SkippedCount = skippedCount
        };
    }
}
