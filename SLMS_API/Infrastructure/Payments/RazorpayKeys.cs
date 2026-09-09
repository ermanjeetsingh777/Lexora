namespace SLMS_API.Infrastructure.Payments;

/// <summary>
/// Razorpay serves test and live traffic from the same API — the key id prefix is the only
/// thing that separates them. These helpers keep a live key out of a developer machine and,
/// more importantly, keep a test key out of production, where captured-but-unfunded payments
/// would clear a member's dues without any money arriving.
/// </summary>
public static class RazorpayKeys
{
    public const string TestPrefix = "rzp_test_";

    public const string LivePrefix = "rzp_live_";

    public static bool IsTestKey(string? keyId)
    {
        return keyId?.Trim().StartsWith(TestPrefix, StringComparison.OrdinalIgnoreCase) == true;
    }

    public static bool IsLiveKey(string? keyId)
    {
        return keyId?.Trim().StartsWith(LivePrefix, StringComparison.OrdinalIgnoreCase) == true;
    }

    /// <summary>
    /// Returns null when the key suits the environment, otherwise the message to show the
    /// person who entered it. Keys with neither prefix are left alone — Razorpay has issued
    /// other formats before and blocking them would be guesswork.
    /// </summary>
    public static string? DescribeMismatch(string? keyId, bool isProduction)
    {
        if (isProduction && IsTestKey(keyId))
        {
            return "This is a Razorpay test key (rzp_test_…). Test payments never move real money, "
                + "so it cannot be used on the live site. Use your live key id.";
        }

        if (!isProduction && IsLiveKey(keyId))
        {
            return "This is a Razorpay live key (rzp_live_…) and this is not the live environment. "
                + "Use your test key id (rzp_test_…) so nobody is charged for real.";
        }

        return null;
    }
}
