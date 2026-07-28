using System.Collections.Generic;
using System.Threading.Tasks;
using SpotifyAllTime.Application.DTOs;

namespace SpotifyAllTime.Application.Interfaces;

public interface IStatsAppService
{
    Task<List<TrackDto>> GetTop100TracksAsync();
}
