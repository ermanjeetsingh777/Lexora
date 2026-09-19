namespace SLMS_API.Application.Options;

/// <summary>Per-policy sliding-window limits (requests per window per client IP).</summary>
public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public bool Enabled { get; set; } = true;

    /// <summary>Login, register, forgot/reset password, refresh.</summary>
    public PolicyOptions Auth { get; set; } = new() { PermitLimit = 10, WindowSeconds = 60 };

    /// <summary>OTP send/verify — tighter than general auth.</summary>
    public PolicyOptions Otp { get; set; } = new() { PermitLimit = 5, WindowSeconds = 60 };

    /// <summary>Public attendance kiosk (library + member).</summary>
    public PolicyOptions Kiosk { get; set; } = new() { PermitLimit = 60, WindowSeconds = 60 };

    /// <summary>Staff member QR resolve / record-by-token.</summary>
    public PolicyOptions MemberQr { get; set; } = new() { PermitLimit = 30, WindowSeconds = 60 };

    public sealed class PolicyOptions
    {
        public int PermitLimit { get; set; } = 60;
        public int WindowSeconds { get; set; } = 60;
    }
}
