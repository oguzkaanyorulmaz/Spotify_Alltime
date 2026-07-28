using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Infrastructure.Persistence;

namespace SpotifyAllTime.Infrastructure.Services;

public class PlaylistSyncJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PlaylistSyncJob> _logger;

    public PlaylistSyncJob(IServiceProvider serviceProvider, ILogger<PlaylistSyncJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Midnight Playlist Sync Job baslatildi.");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Gece yarisina (00:00) kalan sureyi hesapla (Yerel saat dilimine gore UTC+3 olarak kabul edildi)
            var now = DateTime.UtcNow.AddHours(3);
            var nextMidnight = now.Date.AddDays(1);
            var delay = nextMidnight - now;

            _logger.LogInformation("Bir sonraki playlist esitlemesi su saatte: {Time}. Bekleme suresi: {Delay}", nextMidnight, delay);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }

            _logger.LogInformation("Gece yarisi playlist esitlemesi basliyor...");

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<SpotifyDbContext>();
                var syncService = scope.ServiceProvider.GetRequiredService<ISpotifySyncDomainService>();

                var users = await dbContext.SpotifyUsers.ToListAsync(stoppingToken);

                foreach (var user in users)
                {
                    if (string.IsNullOrWhiteSpace(user.TargetPlaylistId))
                        continue;

                    try
                    {
                        _logger.LogInformation("Playlist guncelleniyor: Kullanici: {UserId}, Liste: {PlaylistId}", user.SpotifyUserId, user.TargetPlaylistId);
                        await syncService.SyncTop100PlaylistAsync(user.SpotifyUserId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Playlist guncellenirken hata olustu: Kullanici: {UserId}", user.SpotifyUserId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Midnight Playlist Sync Job ana dongusunde bir hata olustu.");
            }
        }

        _logger.LogInformation("Midnight Playlist Sync Job durduruluyor.");
    }
}
