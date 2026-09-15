namespace SLMS_API.Application.Helpers;

/// <summary>
/// Helpers for member contact vs Identity login emails.
/// Synthetic domain comes from <c>Identity:MemberSyntheticEmailDomain</c> (env: Identity__MemberSyntheticEmailDomain).
/// </summary>
public static class MemberContactHelper
{
    public const string DefaultSyntheticEmailDomain = "member.lexora.local";

    private static string _domain = DefaultSyntheticEmailDomain;

    /// <summary>Domain only (no @), e.g. member.lexora.local</summary>
    public static string SyntheticEmailDomain => _domain;

    /// <summary>Suffix including @, e.g. @member.lexora.local</summary>
    public static string SyntheticEmailSuffix => "@" + _domain;

    public static void Configure(string? domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            _domain = DefaultSyntheticEmailDomain;
            return;
        }

        _domain = domain.Trim().TrimStart('@');
    }

    public static bool IsSyntheticIdentityEmail(string? email)
    {
        if (email is null)
            return false;

        // Current configured domain + default, so older rows stay hidden after a domain change.
        return email.EndsWith(SyntheticEmailSuffix, StringComparison.OrdinalIgnoreCase)
            || email.EndsWith("@" + DefaultSyntheticEmailDomain, StringComparison.OrdinalIgnoreCase);
    }

    public static string? ResolveContactEmail(string? memberEmail, string? userEmail)
    {
        if (!string.IsNullOrWhiteSpace(memberEmail))
            return memberEmail.Trim();

        if (IsSyntheticIdentityEmail(userEmail))
            return null;

        return userEmail?.Trim();
    }

    public static string BuildPhoneSyntheticEmail(string phone) =>
        $"{phone}@{_domain}";

    public static string BuildLibraryScopedUserName(Guid libraryId, string phone) =>
        $"m_{libraryId:N}_{phone}";

    public static string BuildLibraryScopedEmail(Guid libraryId, string phone) =>
        $"m.{libraryId:N}.{phone}@{_domain}";
}
