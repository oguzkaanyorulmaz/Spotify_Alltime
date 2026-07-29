namespace SpotifyAllTime.Application.DTOs;

public class YearlyWrappedDto
{
    public int Year { get; set; }
    public int TotalMinutesPlayed { get; set; }
    public int UniqueTracksCount { get; set; }
    public int UniqueArtistsCount { get; set; }
    public string TopArtistName { get; set; } = string.Empty;
    public int TopArtistPlayCount { get; set; }
}
