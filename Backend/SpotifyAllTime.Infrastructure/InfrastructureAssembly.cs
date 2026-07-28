using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Domain.Interfaces.Repositories;
using SpotifyAllTime.Infrastructure.Configuration;
using SpotifyAllTime.Infrastructure.Persistence;
using SpotifyAllTime.Infrastructure.Persistence.Repositories;
using SpotifyAllTime.Infrastructure.Services;

namespace SpotifyAllTime.Infrastructure;

public static class InfrastructureAssembly
{
    public static void InjectInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Spotify Ayarlarini Bagla
        services.Configure<SpotifySettings>(configuration.GetSection("SpotifySettings"));

        // Veri tabani baglantisi
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<SpotifyDbContext>(options =>
            options.UseSqlServer(connectionString));

        // Repository Kayitlari
        services.AddScoped<ISpotifyUserRepository, SpotifyUserRepository>();
        services.AddScoped<ITrackRepository, TrackRepository>();
        services.AddScoped<IStreamingRecordRepository, StreamingRecordRepository>();

        // Spotify API Client Kaydi (HttpClientFactory destegiyle)
        services.AddHttpClient<ISpotifyApiClient, SpotifyApiClient>();

        // Arka Plan Servislerinin (Background Worker) Kayitlari
        services.AddHostedService<RecentlyPlayedWorker>();
        services.AddHostedService<PlaylistSyncJob>();
    }
}
