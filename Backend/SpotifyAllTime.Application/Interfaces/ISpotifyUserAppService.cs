using System.Threading.Tasks;
using SpotifyAllTime.Application.DTOs;

namespace SpotifyAllTime.Application.Interfaces;

public interface ISpotifyUserAppService
{
    Task<SpotifyUserDto?> GetUserBySpotifyIdAsync(string spotifyUserId);
    Task<SpotifyUserDto> RegisterOrUpdateUserAsync(string code, string redirectUri);
    Task SetTargetPlaylistAsync(string spotifyUserId, string playlistId);
}
