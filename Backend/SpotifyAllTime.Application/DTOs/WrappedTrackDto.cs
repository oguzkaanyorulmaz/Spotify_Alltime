namespace SpotifyAllTime.Application.DTOs;

public class WrappedTrackDto
{
    public string SpotifyTrackId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Album { get; set; } = string.Empty;
    public int PlayCount { get; set; }
    public int TotalMinutesPlayed { get; set; }
    public string? ImageUrl { get; set; }
}
