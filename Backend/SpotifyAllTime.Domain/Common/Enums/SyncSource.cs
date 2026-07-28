namespace SpotifyAllTime.Domain.Common.Enums;

public enum SyncSource
{
    HistoryImport,          // JSON dosyasından yüklenenler
    RecentlyPlayedService   // Arka plan servisinden gelen anlık dinlemeler
}
