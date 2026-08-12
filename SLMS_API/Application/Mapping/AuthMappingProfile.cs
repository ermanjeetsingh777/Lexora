using AutoMapper;
using SLMS_API.Application.Contracts.Auth;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Application.Mapping;

public class AuthMappingProfile : Profile
{
    public AuthMappingProfile()
    {
        CreateMap<TokenResult, AuthResponse>();
        CreateMap<ApplicationUser, CurrentUserResponse>()
            .ForMember(dest => dest.Roles, opt => opt.Ignore())
            .ForMember(dest => dest.Permissions, opt => opt.Ignore());
    }
}
