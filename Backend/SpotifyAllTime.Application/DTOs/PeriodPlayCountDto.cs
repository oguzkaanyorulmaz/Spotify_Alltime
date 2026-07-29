namespace SpotifyAllTime.Application.DTOs;

public class PeriodPlayCountDto
{
    public string Period { get; set; } = string.Empty; // Örn: "2025-06"
    public int PlayCount { get; set; }
}
