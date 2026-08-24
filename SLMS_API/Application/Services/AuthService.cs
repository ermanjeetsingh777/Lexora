using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using SLMS_API.Application.Contracts.Auth.Requests;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Options;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Repositories.Interfaces;
using System.Net;
using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;

namespace SLMS_API.Application.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IOtpCodeRepository _otpCodeRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IPackageService _packageService;
    private readonly IPermissionResolver _permissionResolver;
    private readonly ILogger<AuthService> _logger;
    private readonly IUserPackageService _userPackageService;
    private readonly IEmailSender _emailSender;
    private readonly AppOptions _appOptions;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IJwtTokenService jwtTokenService,
        IRefreshTokenRepository refreshTokenRepository,
        IOtpCodeRepository otpCodeRepository,
        IAuditLogService auditLogService,
        IPermissionResolver permissionResolver,
        IPackageService packageService,
        IUserPackageService userPackageService,
        IEmailSender emailSender,
        IOptions<AppOptions> appOptions,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
        _refreshTokenRepository = refreshTokenRepository;
        _otpCodeRepository = otpCodeRepository;
        _auditLogService = auditLogService;
        _permissionResolver = permissionResolver;
        _logger = logger;
        _packageService = packageService;
        _userPackageService = userPackageService;
        _emailSender = emailSender;
        _appOptions = appOptions.Value;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var user = new ApplicationUser
        {
            FullName = request.Name,
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            OnboardingStep = OnboardingStep.Registered,
            UserType = request.UserType,
            IsActive = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        // Create UserPackage
        var package = await _packageService.GetByIdAsync(request.PackageId, cancellationToken);
        if (package is null || !package.IsActive)
        {
            throw new InvalidOperationException("The selected package does not exist or is not available.");
        }

        var subscribePackageRequest = new SubscribePackageRequest
        {
            PackageId = request.PackageId,
            AutoRenew = false,
        };

        var userPackageResult = await _userPackageService.SubscribeAsync(user.Id, subscribePackageRequest, cancellationToken);

        if (userPackageResult == null)
        {
            throw new InvalidOperationException("Unable to subscribe the selected package.");
        }

        await EnsureRoleExistsAsync(RoleDefinitions.OrganisationAdmin, cancellationToken);
        await _userManager.AddToRoleAsync(user, RoleDefinitions.OrganisationAdmin);

        await _auditLogService.WriteAsync(AuditEventTypes.Register, user.Id, $"User registered: {user.Email}", ipAddress, cancellationToken);

        var tokens = await IssueTokensAsync(user, cancellationToken);
        var currentUser = await GetCurrentUserAsync(user.Id, cancellationToken);

        if (currentUser == null)
        {
            throw new UnauthorizedAccessException("User is not authenticated. Please sign in and try again.");
        }
        return MapAuthResponse(tokens, currentUser);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Email address is not registered.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Your account is inactive. Please contact the administrator.");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Please enter the correct password.");
        }

        if (user.TwoFactorEnabled)
        {
            return new AuthResponse
            {
                RequiresTwoFactor = true,
                UserId = user.Id
            };
        }

        await _auditLogService.WriteAsync(AuditEventTypes.Login, user.Id, $"User logged in: {user.Email}", ipAddress, cancellationToken);

        var tokens = await IssueTokensAsync(user, cancellationToken);
        var currentUser = await GetCurrentUserAsync(user.Id, cancellationToken);

        if (currentUser == null)
        {
            throw new UnauthorizedAccessException("User is not authenticated. Please sign in and try again.");
        }
        return MapAuthResponse(tokens, currentUser);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var existingToken = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken, cancellationToken);
        if (existingToken is null || !existingToken.IsActive)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        var user = await _userManager.FindByIdAsync(existingToken.UserId);
        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("User account is not available.");
        }

        var newTokens = await IssueTokensAsync(user, cancellationToken);

        await _refreshTokenRepository.RevokeAsync(existingToken, newTokens.RefreshToken, "Rotated", cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Refresh token rotated for user {UserId} from {IpAddress}", user.Id, ipAddress);

        var currentUser = await GetCurrentUserAsync(user.Id, cancellationToken);

        if (currentUser == null)
        {
            throw new UnauthorizedAccessException("User is not authenticated. Please sign in and try again.");
        }
        return MapAuthResponse(newTokens, currentUser);
    }

    public async Task LogoutAsync(LogoutRequest request, string? userId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken, cancellationToken);
        if (token is not null && token.IsActive)
        {
            if (!string.IsNullOrWhiteSpace(userId) && token.UserId != userId)
            {
                throw new UnauthorizedAccessException("Refresh token does not belong to the current user.");
            }

            await _refreshTokenRepository.RevokeAsync(token, null, "Logout", cancellationToken);
            await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.WriteAsync(AuditEventTypes.Logout, token.UserId, "User logged out", ipAddress, cancellationToken);
        }
    }

    public async Task<MessageResponse> SendOtpAsync(SendOtpRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            throw new InvalidOperationException("User not found.");
        }

        await _otpCodeRepository.InvalidateAllForUserAsync(user.Id, request.Purpose, cancellationToken);

        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var otp = new OtpCode
        {
            UserId = user.Id,
            Code = code,
            Purpose = request.Purpose,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
        };

        await _otpCodeRepository.AddAsync(otp, cancellationToken);
        await _otpCodeRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("OTP sent for user {Email}, purpose {Purpose}. Code: {Code}", request.Email, request.Purpose, code);

        return new MessageResponse { Message = "OTP sent successfully." };
    }

    public async Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            throw new InvalidOperationException("User not found.");
        }

        var otp = await _otpCodeRepository.GetLatestValidAsync(user.Id, request.Purpose, cancellationToken);
        if (otp is null || otp.Code != request.Code)
        {
            throw new UnauthorizedAccessException("Invalid or expired OTP.");
        }

        otp.IsUsed = true;
        await _otpCodeRepository.SaveChangesAsync(cancellationToken);

        if (request.Purpose == OtpPurpose.Login || request.Purpose == OtpPurpose.TwoFactor)
        {
            await _auditLogService.WriteAsync(AuditEventTypes.Login, user.Id, $"User logged in via OTP: {user.Email}", ipAddress, cancellationToken);
            var tokens = await IssueTokensAsync(user, cancellationToken);
            var currentUser = await GetCurrentUserAsync(user.Id, cancellationToken);

            if (currentUser == null)
            {
                throw new UnauthorizedAccessException("User is not authenticated. Please sign in and try again.");
            }
            return MapAuthResponse(tokens, currentUser);
        }

        return new AuthResponse { UserId = user.Id };
    }

    public async Task<MessageResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        const string responseMessage = "If the email exists, a password reset mail has been sent.";

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new MessageResponse { Message = responseMessage };
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var frontendBase = _appOptions.FrontendBaseUrl.TrimEnd('/');
        var resetUrl =
            $"{frontendBase}/reset-password?email={Uri.EscapeDataString(request.Email.Trim())}&token={encodedToken}";

        var htmlBody = $"""
            <p>Hello{(string.IsNullOrWhiteSpace(user.FullName) ? "" : $" {WebUtility.HtmlEncode(user.FullName)}")},</p>
            <p>We received a request to reset your SLMS account password.</p>
            <p><a href="{WebUtility.HtmlEncode(resetUrl)}">Reset your password</a></p>
            <p>If you did not request this, you can ignore this email.</p>
            <p>This link expires when used or when a newer reset is requested.</p>
            """;

        try
        {
            await _emailSender.SendAsync(
                request.Email.Trim(),
                "Reset your SLMS password",
                htmlBody,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", request.Email);
        }

        _logger.LogInformation("Password reset requested for {Email}. Reset URL: {ResetUrl}", request.Email, resetUrl);

        return new MessageResponse { Message = responseMessage };
    }

    public async Task<MessageResponse> ResetPasswordAsync(ResetPasswordRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            throw new InvalidOperationException("Invalid password reset request.");
        }

        string decodedToken;
        try
        {
            decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
        }
        catch
        {
            throw new InvalidOperationException("Invalid password reset token.");
        }

        var result = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _refreshTokenRepository.RevokeAllForUserAsync(user.Id, "PasswordReset", cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

        await _auditLogService.WriteAsync(AuditEventTypes.PasswordReset, user.Id, $"Password reset for: {user.Email}", ipAddress, cancellationToken);

        return new MessageResponse { Message = "Password has been reset successfully." };
    }

    public async Task<CurrentUserResponse?> GetCurrentUserAsync(string userId, CancellationToken cancellationToken = default)
    {

        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new CurrentUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            FullName = user.FullName,
            IsActive = user.IsActive,
            UserType = user.UserType,
            OnboardingStep = user.OnboardingStep,
            TwoFactorEnabled = user.TwoFactorEnabled,
            Roles = roles.ToArray(),
            Permissions = await _permissionResolver.GetPermissionsForRolesAsync(roles, cancellationToken)
        };
    }

    public async Task<TwoFactorSetupResponse> Enable2FaAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        await _userManager.ResetAuthenticatorKeyAsync(user);
        var key = await _userManager.GetAuthenticatorKeyAsync(user)
            ?? throw new InvalidOperationException("Unable to generate authenticator key.");

        var email = user.Email ?? user.UserName ?? user.Id;
        var authenticatorUri = GenerateAuthenticatorUri(email, key);

        return new TwoFactorSetupResponse
        {
            SharedKey = FormatKey(key),
            AuthenticatorUri = authenticatorUri
        };
    }

    public async Task<MessageResponse> ConfirmEnable2FaAsync(string userId, Enable2FaRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code ?? string.Empty);
        if (!isValid)
        {
            throw new InvalidOperationException("Invalid authenticator code.");
        }

        await _userManager.SetTwoFactorEnabledAsync(user, true);

        return new MessageResponse { Message = "Two-factor authentication has been enabled." };
    }

    public async Task<MessageResponse> Disable2FaAsync(string userId, Disable2FaRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        if (!user.TwoFactorEnabled)
        {
            throw new InvalidOperationException("Two-factor authentication is not enabled.");
        }

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code ?? string.Empty);
        if (!isValid)
        {
            throw new InvalidOperationException("Invalid authenticator code.");
        }

        await _userManager.SetTwoFactorEnabledAsync(user, false);
        await _userManager.ResetAuthenticatorKeyAsync(user);

        return new MessageResponse { Message = "Two-factor authentication has been disabled." };
    }

    private async Task<Contracts.Auth.TokenResult> IssueTokensAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var permissions = await _permissionResolver.GetPermissionsForRolesAsync(roles, cancellationToken);
        return await _jwtTokenService.GenerateTokensAsync(user, roles.ToArray(), permissions, cancellationToken);
    }

    public async Task<bool> UpdateOnboardingStepAsync(string userId, OnboardingStep onboardingStep, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);

        if (user is null)
            return false;
        if (user.OnboardingStep == OnboardingStep.Completed)
        {
            return false;
        }
        user.OnboardingStep = onboardingStep;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);

        return result.Succeeded;
    }
    private static AuthResponse MapAuthResponse(Contracts.Auth.TokenResult tokens, CurrentUserResponse userInfo) =>
        new()
        {
            AccessToken = tokens.AccessToken,
            AccessTokenExpiresAtUtc = tokens.AccessTokenExpiresAtUtc,
            RefreshToken = tokens.RefreshToken,
            RefreshTokenExpiresAtUtc = tokens.RefreshTokenExpiresAtUtc,
            User = userInfo
        };

    public async Task EnsureRoleExistsAsync(string roleName, CancellationToken cancellationToken)
    {
        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            await _roleManager.CreateAsync(new IdentityRole(roleName));
        }
    }

    private static string FormatKey(string key) =>
        string.Join(" ", Enumerable.Range(0, key.Length / 4).Select(i => key.Substring(i * 4, 4)));

    private static string GenerateAuthenticatorUri(string email, string key)
    {
        const string issuer = "SLMS_API";
        return string.Format(
            "otpauth://totp/{0}:{1}?secret={2}&issuer={0}&digits=6",
            UrlEncoder.Default.Encode(issuer),
            UrlEncoder.Default.Encode(email),
            key);
    }
}
