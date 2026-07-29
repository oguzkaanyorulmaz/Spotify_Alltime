using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SpotifyAllTime.Application.DTOs;

namespace SpotifyAllTime.Application.Interfaces;

public interface IStatsAppService
{
    Task<List<TrackDto>> GetTop100TracksAsync();
    Task<YearlyWrappedDto> GetWrappedStatsAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate);
    Task<PagedResultDto<WrappedTrackDto>> GetTopTracksPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy);
    Task<PagedResultDto<WrappedArtistDto>> GetTopArtistsPagedAsync(string spotifyUserId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string sortBy);
    Task<List<PeriodPlayCountDto>> GetTrackPlayHistoryAsync(string spotifyUserId, string trackUri);
    Task<List<PeriodPlayCountDto>> GetArtistPlayHistoryAsync(string spotifyUserId, string artistName);
}

