using SLMS_API.Application.Contracts.Auth.Requests;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Common;

namespace SLMS_API.Application.Services.Interfaces;

public interface IProfileService
{
    Task<UserProfileResponse?> GetProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<UserProfileResponse> UpdateProfileAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task<MessageResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request, string? ipAddress, CancellationToken cancellationToken = default);
}
