using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SpotifyAllTime.Domain.Entities;
using SpotifyAllTime.Domain.Interfaces.Abstractions;
using SpotifyAllTime.Domain.Interfaces.DomainServices;
using SpotifyAllTime.Domain.Interfaces.Repositories;

namespace SpotifyAllTime.Domain.Services;

public class MetadataEnrichmentDomainService : IMetadataEnrichmentDomainService
{
    private readonly ISpotifyUserRepository _userRepository;
    private readonly ITrackRepository _trackRepository;
    private readonly ISpotifyApiClient _spotifyApiClient;

    public MetadataEnrichmentDomainService(
        ISpotifyUserRepository userRepository,
        ITrackRepository trackRepository,
        ISpotifyApiClient spotifyApiClient)
    {
        _userRepository = userRepository;
        _trackRepository = trackRepository;
        _spotifyApiClient = spotifyApiClient;
    }

    public async Task EnrichTopTracksAsync(string spotifyUserId, int count = 500)
    {
        var user = await _userRepository.GetBySpotifyIdAsync(spotifyUserId);
        if (user == null) return;

        // Token süresi dolmuşsa yenile
        if (user.IsTokenExpired())
        {
            var (accessToken, expiresInSeconds) = await _spotifyApiClient.RefreshTokenAsync(user.RefreshToken);
            user.UpdateTokens(accessToken, user.RefreshToken, expiresInSeconds);
            await _userRepository.UpdateAsync(user);
        }

        // Zenginleştirilecek en çok dinlenen N şarkıyı çek
        var topTracks = await _trackRepository.GetTopTracksAsync(count);
        if (!topTracks.Any()) return;

        // Spotify Track ID'lerini ayıkla (spotify:track: kısmını atarak)
        var trackIds = topTracks
            .Select(t => t.SpotifyTrackUri.Replace("spotify:track:", ""))
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        var updatedTracks = new List<Track>();

        // Spotify API toplu isteklerde en fazla 50 ID kabul eder. 50'şerli paketlere ayırıyoruz.
        foreach (var chunk in trackIds.Chunk(50))
        {
            try
            {
                var spotifyMetadatas = await _spotifyApiClient.GetTracksMetadataAsync(chunk, user.AccessToken);

                foreach (var metadata in spotifyMetadatas)
                {
                    var existingTrack = topTracks.FirstOrDefault(t => t.SpotifyTrackUri == metadata.TrackUri);
                    if (existingTrack != null)
                    {
                        var isUpdated = false;

                        // Şarkı adı, sanatçı veya albüm adı güncellenmişse (örneğin " - Reimagined" eklendiyse) veri tabanını güncelle
                        if (existingTrack.TrackName != metadata.TrackName)
                        {
                            existingTrack.TrackName = metadata.TrackName;
                            isUpdated = true;
                        }

                        if (existingTrack.ArtistName != metadata.ArtistName)
                        {
                            existingTrack.ArtistName = metadata.ArtistName;
                            isUpdated = true;
                        }

                        if (existingTrack.AlbumName != metadata.AlbumName)
                        {
                            existingTrack.AlbumName = metadata.AlbumName;
                            isUpdated = true;
                        }

                        if (isUpdated)
                        {
                            updatedTracks.Add(existingTrack);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Bir paket hata verirse diğer paketlerin devam etmesi için loglayıp devam ediyoruz
                Console.WriteLine($"[Metadata Enrichment Error] Chunk processing failed: {ex.Message}");
            }
        }

        // Değişen şarkıları toplu olarak kaydet
        if (updatedTracks.Any())
        {
            await _trackRepository.BulkAddOrUpdateAsync(updatedTracks);
        }
    }
}
