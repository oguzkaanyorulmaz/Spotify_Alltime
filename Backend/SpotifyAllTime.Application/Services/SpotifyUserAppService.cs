using System;
using System.Threading.Tasks;
using AutoMapper;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Application.Services;

public class SpotifyUserAppService : ISpotifyUserAppService
{
    private readonly ISpotifyUserRepository _userRepository;
    private readonly ISpotifyApiClient _spotifyApiClient;
    private readonly IMapper _mapper;

    public SpotifyUserAppService(
        ISpotifyUserRepository userRepository,
        ISpotifyApiClient spotifyApiClient,
        IMapper mapper)
    {
        _userRepository = userRepository;
        _spotifyApiClient = spotifyApiClient;
        _mapper = mapper;
    }

    public async Task<SpotifyUserDto?> GetUserBySpotifyIdAsync(string spotifyUserId)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        return _mapper.Map<SpotifyUserDto>(user);
    }

    public async Task<SpotifyUserDto> RegisterOrUpdateUserAsync(string code, string redirectUri)
    {
        // 1. Spotify yetkilendirme kodu ile belirteçleri (access token, refresh token) al
        var (accessToken, refreshToken, expiresInSeconds) = await _spotifyApiClient.AuthenticateWithCodeAsync(code, redirectUri);

        // 2. Spotify kullanıcı profili detaylarını sorgula
        var (spotifyUserId, displayName, email) = await _spotifyApiClient.GetUserProfileAsync(accessToken);

        // 3. Kullanıcı veri tabanında var mı kontrol et, varsa güncelle yoksa oluştur
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null)
        {
            user = new SpotifyUser
            {
                Id = Guid.NewGuid(),
                SpotifyUserId = spotifyUserId,
                DisplayName = displayName,
                Email = email
            };
            user.UpdateTokens(accessToken, refreshToken, expiresInSeconds);
            await _userRepository.AddAsync(user);
        }
        else
        {
            user.DisplayName = displayName;
            user.Email = email;
            user.UpdateTokens(accessToken, refreshToken, expiresInSeconds);
            await _userRepository.UpdateAsync(user);
        }

        return _mapper.Map<SpotifyUserDto>(user);
    }

    public async Task SetTargetPlaylistAsync(string spotifyUserId, string playlistId)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user != null)
        {
            user.TargetPlaylistId = playlistId;
            await _userRepository.UpdateAsync(user);
        }
    }
}
