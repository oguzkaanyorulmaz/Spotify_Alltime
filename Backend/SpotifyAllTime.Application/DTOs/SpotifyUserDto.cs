using System;

namespace SpotifyAllTime.Application.DTOs;

public class SpotifyUserDto
{
    public Guid Id { get; set; }
    public string SpotifyUserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? TargetPlaylistId { get; set; }
}
