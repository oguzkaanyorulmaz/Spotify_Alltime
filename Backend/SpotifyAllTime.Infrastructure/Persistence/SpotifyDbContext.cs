using Microsoft.EntityFrameworkCore;
using SpotifyAllTime.Domain.Entities;

namespace SpotifyAllTime.Infrastructure.Persistence;

public class SpotifyDbContext : DbContext
{
    public SpotifyDbContext(DbContextOptions<SpotifyDbContext> options) : base(options)
    {
    }

    public DbSet<SpotifyUser> SpotifyUsers => Set<SpotifyUser>();
    public DbSet<Track> Tracks => Set<Track>();
    public DbSet<StreamingRecord> StreamingRecords => Set<StreamingRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // SpotifyUser Yapılandırması
        modelBuilder.Entity<SpotifyUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SpotifyUserId).IsUnique();
            entity.Property(e => e.SpotifyUserId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(200);
            entity.Property(e => e.AccessToken).IsRequired();
            entity.Property(e => e.RefreshToken).IsRequired();
        });

        // Track Yapılandırması
        modelBuilder.Entity<Track>(entity =>
        {
            entity.HasKey(e => e.SpotifyTrackUri);
            entity.Property(e => e.SpotifyTrackUri).HasMaxLength(200);
            entity.Property(e => e.TrackName).HasMaxLength(300).IsRequired();
            entity.Property(e => e.ArtistName).HasMaxLength(300).IsRequired();
            entity.Property(e => e.AlbumName).HasMaxLength(300);
            entity.Property(e => e.PlayCount).HasDefaultValue(0);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
        });

        // StreamingRecord Yapılandırması
        modelBuilder.Entity<StreamingRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SpotifyUserId, e.SpotifyTrackUri, e.PlayedAt }).IsUnique();

            entity.Property(e => e.SpotifyUserId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.SpotifyTrackUri).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Source).HasConversion<string>().HasMaxLength(50).IsRequired();
        });
    }
}
