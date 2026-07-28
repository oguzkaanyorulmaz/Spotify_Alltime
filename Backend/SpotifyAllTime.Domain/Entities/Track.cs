namespace SpotifyAllTime.Domain.Entities;

public class Track
{
    public string SpotifyTrackUri { get; set; } = string.Empty;
    public string TrackName { get; set; } = string.Empty;
    public string ArtistName { get; set; } = string.Empty;
    public string AlbumName { get; set; } = string.Empty;
    public int PlayCount { get; set; }

    public void IncrementPlayCount(int count = 1)
    {
        PlayCount += count;
    }
}
