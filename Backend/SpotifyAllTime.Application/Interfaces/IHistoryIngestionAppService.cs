using System.Threading.Tasks;
using SpotifyAllTime.Application.DTOs;

namespace SpotifyAllTime.Application.Interfaces;

public interface IHistoryIngestionAppService
{
    Task<HistoryImportResultDto> ImportHistoryAsync(string spotifyUserId, string jsonContent);
}
