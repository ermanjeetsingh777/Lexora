using SLMS_API.Application.Contracts.Admin;
using SLMS_API.Application.Contracts.Auth.Requests;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task LogoutAsync(LogoutRequest request, string? userId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<MessageResponse> SendOtpAsync(SendOtpRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<MessageResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<MessageResponse> ResetPasswordAsync(ResetPasswordRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<TwoFactorSetupResponse> Enable2FaAsync(string userId, CancellationToken cancellationToken = default);
    Task<MessageResponse> ConfirmEnable2FaAsync(string userId, Enable2FaRequest request, CancellationToken cancellationToken = default);
    Task<MessageResponse> Disable2FaAsync(string userId, Disable2FaRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateOnboardingStepAsync(string userId, OnboardingStep onboardingStep, CancellationToken cancellationToken = default);
    Task EnsureRoleExistsAsync(string roleName, CancellationToken cancellationToken = default);
    Task<TenantRegistrationStatusResponse> GetRegistrationStatusAsync(string userId, CancellationToken cancellationToken = default);
}
