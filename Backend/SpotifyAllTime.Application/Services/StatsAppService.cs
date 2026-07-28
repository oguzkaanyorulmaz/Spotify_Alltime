using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Application.Services;

public class StatsAppService : IStatsAppService
{
    private readonly ITrackRepository _trackRepository;
    private readonly IMapper _mapper;

    public StatsAppService(ITrackRepository trackRepository, IMapper mapper)
    {
        _trackRepository = trackRepository;
        _mapper = mapper;
    }

    public async Task<List<TrackDto>> GetTop100TracksAsync()
    {
        var tracks = await _trackRepository.GetTopTracksAsync(100);
        return _mapper.Map<List<TrackDto>>(tracks);
    }
}
