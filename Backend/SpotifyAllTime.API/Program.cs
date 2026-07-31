using Microsoft.EntityFrameworkCore;
using SpotifyAllTime.API.Middleware;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Application.Mappings;
using SpotifyAllTime.Application.Services;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Domain.Services;
using SpotifyAllTime.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Load .env variables
var root = Directory.GetCurrentDirectory();
var dotenvPath = Path.Combine(root, ".env");
if (!File.Exists(dotenvPath))
{
    var parent = Directory.GetParent(root);
    for (int i = 0; i < 3 && parent != null; i++)
    {
        var tempPath = Path.Combine(parent.FullName, ".env");
        if (File.Exists(tempPath))
        {
            dotenvPath = tempPath;
            break;
        }
        parent = parent.Parent;
    }
}

if (File.Exists(dotenvPath))
{
    Console.WriteLine($"--> Loading environment variables from {dotenvPath}");
    foreach (var line in File.ReadAllLines(dotenvPath))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
        var parts = line.Split('=', 2);
        if (parts.Length != 2) continue;
        var key = parts[0].Trim();
        var val = parts[1].Trim('\'', '"', ' ');
        Environment.SetEnvironmentVariable(key, val);
        
        if (key == "SPOTIFY_CLIENT_ID")
        {
            builder.Configuration["SpotifySettings:ClientId"] = val;
        }
        else if (key == "SPOTIFY_CLIENT_SECRET")
        {
            builder.Configuration["SpotifySettings:ClientSecret"] = val;
        }
        else
        {
            builder.Configuration[key] = val;
        }
    }
}

// Logging yapılandırması (EventLog kaynaklı kilitlenme ve çökmeleri engellemek için)
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Controller Servisleri
builder.Services.AddControllers();

// AutoMapper Konfigürasyonu
builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

// Domain Servisleri (Domain Services)
builder.Services.AddScoped<IHistoryIngestionDomainService, HistoryIngestionDomainService>();
builder.Services.AddScoped<ISpotifySyncDomainService, SpotifySyncDomainService>();


// Uygulama Servisleri (Application App Services)
builder.Services.AddScoped<ISpotifyUserAppService, SpotifyUserAppService>();
builder.Services.AddScoped<IHistoryIngestionAppService, HistoryIngestionAppService>();
builder.Services.AddScoped<IStatsAppService, StatsAppService>();

// Altyapı Enjeksiyonu (DbContext, Repositories, Workers, HttpClient vb.)
builder.Services.InjectInfrastructure(builder.Configuration);

// CORS Yapılandırması (React Uygulamasıyla haberleşebilmek için)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Veritabanı sayaç düzeltmesini ve kolon kontrolünü başlangıçta çalıştır
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<SpotifyAllTime.Infrastructure.Persistence.SpotifyDbContext>();
        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tracks') AND name = 'ImageUrl') " +
                "ALTER TABLE Tracks ADD ImageUrl NVARCHAR(500) NULL;"
            );
            Console.WriteLine("--> Tracks tablosuna ImageUrl sutunu basariyla eklendi / kontrol edildi.");
        }
        catch (Exception exCol)
        {
            Console.WriteLine($"--> ImageUrl sutunu kontrolu/eklenmesi sirasinda hata: {exCol.Message}");
        }

        var trackRepo = scope.ServiceProvider.GetRequiredService<SpotifyAllTime.Domain.Interfaces.Repositories.ITrackRepository>();
        await trackRepo.RecalculateTrackPlayCountsAsync();
        Console.WriteLine("--> Veritabanindaki tum sarki sayaclari ham dinleme verileriyle basariyla senkronize edildi!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"--> Sayac duzeltmesi sirasinda hata olustu: {ex.Message}");
    }
}

// Küresel Hata Middleware'i
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

app.MapControllers();

app.Run();
