using System;
using SpotifyAllTime.Domain.Common.Enums;

namespace SpotifyAllTime.Domain.Entities;

public class StreamingRecord
{
    public Guid Id { get; set; }
    public string SpotifyUserId { get; set; } = string.Empty;
    public string SpotifyTrackUri { get; set; } = string.Empty;
    public DateTime PlayedAt { get; set; }
    public int MsPlayed { get; set; }
    public SyncSource Source { get; set; }
}
