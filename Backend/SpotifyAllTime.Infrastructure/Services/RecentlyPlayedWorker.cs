using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace SpotifyAllTime.Infrastructure.Services;

public class RecentlyPlayedWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RecentlyPlayedWorker> _logger;

    public RecentlyPlayedWorker(IServiceProvider serviceProvider, ILogger<RecentlyPlayedWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recently Played Worker baslatildi.");

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Recently Played Sync islemi yurutuluyor...");

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<SpotifyDbContext>();
                var syncService = scope.ServiceProvider.GetRequiredService<ISpotifySyncDomainService>();

                // Sistemdeki tum kullanicilarin son caldiklarini guncelle
                var users = await dbContext.SpotifyUsers.ToListAsync(stoppingToken);

                foreach (var user in users)
                {
                    try
                    {
                        _logger.LogInformation("Kullanici icin esitleme baslatiliyor: {UserId}", user.SpotifyUserId);
                        await syncService.SyncRecentlyPlayedAsync(user.SpotifyUserId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Kullanici esitlenirken hata olustu: {UserId}", user.SpotifyUserId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Recently Played Worker ana dongusunde bir hata olustu.");
            }

            // Her 30 dakikada bir kontrol et
            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }

        _logger.LogInformation("Recently Played Worker durduruluyor.");
    }
}
