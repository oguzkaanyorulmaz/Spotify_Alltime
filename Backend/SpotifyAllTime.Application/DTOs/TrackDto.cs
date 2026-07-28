using System;

namespace SpotifyAllTime.Application.DTOs;

public class TrackDto
{
    public Guid Id { get; set; }
    public string SpotifyTrackId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string? Album { get; set; }
    public string? PreviewUrl { get; set; }
    public string? ImageUrl { get; set; }
    public int PlayCount { get; set; }

}
