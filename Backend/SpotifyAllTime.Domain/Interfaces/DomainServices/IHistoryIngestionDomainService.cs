using System.Threading.Tasks;

namespace SpotifyAllTime.Domain.Interfaces.DomainServices;

public interface IHistoryIngestionDomainService
{
    Task<(int ImportedCount, int SkippedCount)> IngestHistoryJsonAsync(string spotifyUserId, string jsonContent);
}
