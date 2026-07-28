using System.Threading.Tasks;

namespace SpotifyAllTime.Domain.Interfaces.DomainServices;

public interface IMetadataEnrichmentDomainService
{
    Task EnrichTopTracksAsync(string spotifyUserId, int count = 500);
}
