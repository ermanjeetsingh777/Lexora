using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Auth.Requests;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IProfileService _profileService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, IProfileService profileService, ICurrentUserService currentUserService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _profileService = profileService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.RegisterAsync(request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "Registration successful."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Registration failed for {Email}", request.Email);
            return BadRequest(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.LoginAsync(request, _currentUserService.IpAddress, cancellationToken);
            var message = result.RequiresTwoFactor ? "Two-factor authentication required." : "Login successful.";
            return Ok(ApiResponse<AuthResponse>.Ok(result, message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken(
        [FromBody] RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "Token refreshed successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Logout(
        [FromBody] LogoutRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _authService.LogoutAsync(request, _currentUserService.UserId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Logout successful." }));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("send-otp")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> SendOtp(
        [FromBody] SendOtpRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.SendOtpAsync(request, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("verify-otp")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> VerifyOtp(
        [FromBody] VerifyOtpRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.VerifyOtpAsync(request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "OTP verified successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ForgotPasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<MessageResponse>.Ok(result));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.ResetPasswordAsync(request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("current-user")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var user = await _currentUserService.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return NotFound(ApiResponse<CurrentUserResponse>.Fail("User not found."));
        }

        return Ok(ApiResponse<CurrentUserResponse>.Ok(user));
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserProfileResponse>>> GetProfile(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        var profile = await _profileService.GetProfileAsync(userId, cancellationToken);
        if (profile is null)
        {
            return NotFound(ApiResponse<UserProfileResponse>.Fail("User not found."));
        }

        return Ok(ApiResponse<UserProfileResponse>.Ok(profile));
    }

    [HttpPatch("profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserProfileResponse>>> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var profile = await _profileService.UpdateProfileAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<UserProfileResponse>.Ok(profile, "Profile updated."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UserProfileResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var result = await _profileService.ChangePasswordAsync(userId, request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("enable-2fa")]
    [Authorize]
    public async Task<IActionResult> Enable2Fa(
        [FromBody] Enable2FaRequest? request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<object>.Fail("User is not authenticated."));
        }

        try
        {
            if (string.IsNullOrWhiteSpace(request?.Code))
            {
                var setup = await _authService.Enable2FaAsync(userId, cancellationToken);
                return Ok(ApiResponse<TwoFactorSetupResponse>.Ok(setup, "Scan the QR code with your authenticator app, then call this endpoint again with the code."));
            }

            var result = await _authService.ConfirmEnable2FaAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("disable-2fa")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Disable2Fa(
        [FromBody] Disable2FaRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<MessageResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var result = await _authService.Disable2FaAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }
}
