using System.Collections.Generic;

namespace SpotifyAllTime.Application.DTOs;

public class CustomPlaylistRequest
{
    public string PlaylistName { get; set; } = "Custom Filtered Playlist";
    public int? StartYear { get; set; }
    public int? EndYear { get; set; }
    public List<string>? IncludedArtists { get; set; }
    public List<string>? ExcludedArtists { get; set; }
    public int TrackCount { get; set; } = 50;
    public bool FillMissing { get; set; } = false;
    public bool UseRandom { get; set; } = false;
}
