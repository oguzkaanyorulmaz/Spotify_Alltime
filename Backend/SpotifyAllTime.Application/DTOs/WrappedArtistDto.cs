namespace SpotifyAllTime.Application.DTOs;

public class WrappedArtistDto
{
    public string ArtistName { get; set; } = string.Empty;
    public int PlayCount { get; set; }
    public int TotalMinutesPlayed { get; set; }
}
