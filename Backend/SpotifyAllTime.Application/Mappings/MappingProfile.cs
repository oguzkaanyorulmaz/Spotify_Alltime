using AutoMapper;
using SpotifyAllTime.Application.DTOs;
using SpotifyAllTime.Domain.Entities;

namespace SpotifyAllTime.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Track, TrackDto>()
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.TrackName))
            .ForMember(dest => dest.Artist, opt => opt.MapFrom(src => src.ArtistName))
            .ForMember(dest => dest.Album, opt => opt.MapFrom(src => src.AlbumName))
            .ForMember(dest => dest.SpotifyTrackId, opt => opt.MapFrom(src => src.SpotifyTrackUri.Replace("spotify:track:", "")))
            .ForMember(dest => dest.PlayCount, opt => opt.MapFrom(src => src.PlayCount));

        CreateMap<SpotifyUser, SpotifyUserDto>();
    }
}
