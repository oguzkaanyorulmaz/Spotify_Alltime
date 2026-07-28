using SpotifyAllTime.API.Middleware;
using SpotifyAllTime.Application.Interfaces;
using SpotifyAllTime.Application.Mappings;
using SpotifyAllTime.Application.Services;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Domain.Services;
using SpotifyAllTime.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Controller Servisleri
builder.Services.AddControllers();

// AutoMapper Konfigürasyonu
builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

// Domain Servisleri (Domain Services)
builder.Services.AddScoped<IHistoryIngestionDomainService, HistoryIngestionDomainService>();
builder.Services.AddScoped<ISpotifySyncDomainService, SpotifySyncDomainService>();
builder.Services.AddScoped<IMetadataEnrichmentDomainService, MetadataEnrichmentDomainService>();

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

// Küresel Hata Middleware'i
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

app.MapControllers();

app.Run();
