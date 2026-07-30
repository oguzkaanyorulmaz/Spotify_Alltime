namespace SpotifyAllTime.Application.DTOs;

public class YearlyWrappedDto
{
    public int Year { get; set; }
    public int TotalMinutesPlayed { get; set; }
    public int UniqueTracksCount { get; set; }
    public int UniqueArtistsCount { get; set; }
    public string TopArtistName { get; set; } = string.Empty;
    public int TopArtistPlayCount { get; set; }
    public string TopTrackTitle { get; set; } = string.Empty;
    public string TopTrackArtistName { get; set; } = string.Empty;
    public int TopTrackMinutesPlayed { get; set; }
    public System.Collections.Generic.List<GenreCountDto> TopGenres { get; set; } = new();
}
