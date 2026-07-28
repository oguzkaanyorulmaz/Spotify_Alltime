using System;

namespace SpotifyAllTime.Domain.Entities;

public class SpotifyUser
{
    public Guid Id { get; set; }
    public string SpotifyUserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime TokenExpiresAt { get; set; }
    public string? TargetPlaylistId { get; set; }

    public bool IsTokenExpired()
    {
        // Gecikmeleri önlemek adına token süresini 5 dakika önceden bitmiş sayıyoruz
        return DateTime.UtcNow >= TokenExpiresAt.AddMinutes(-5);
    }

    public void UpdateTokens(string accessToken, string refreshToken, int expiresInSeconds)
    {
        AccessToken = accessToken;
        RefreshToken = refreshToken;
        TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresInSeconds);
    }
}
