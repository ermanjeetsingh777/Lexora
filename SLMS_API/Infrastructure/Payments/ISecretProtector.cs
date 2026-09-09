using Microsoft.AspNetCore.DataProtection;

namespace SLMS_API.Infrastructure.Payments;

/// <summary>
/// Encrypts gateway credentials before they are written to the database. Institutions
/// hand us their key secret and webhook secret; those must never sit in plain text.
/// </summary>
public interface ISecretProtector
{
    string? Protect(string? plainText);

    string? Unprotect(string? cipherText);
}

public class SecretProtector : ISecretProtector
{
    private const string Purpose = "Lexora.PaymentCredentials.v1";

    private readonly IDataProtector _protector;
    private readonly ILogger<SecretProtector> _logger;

    public SecretProtector(IDataProtectionProvider provider, ILogger<SecretProtector> logger)
    {
        _protector = provider.CreateProtector(Purpose);
        _logger = logger;
    }

    public string? Protect(string? plainText)
    {
        return string.IsNullOrWhiteSpace(plainText) ? null : _protector.Protect(plainText);
    }

    public string? Unprotect(string? cipherText)
    {
        if (string.IsNullOrWhiteSpace(cipherText))
        {
            return null;
        }

        try
        {
            return _protector.Unprotect(cipherText);
        }
        catch (Exception ex)
        {
            // Happens when the data protection keyring is rotated or lost — the
            // institution has to re-enter its credentials.
            _logger.LogError(ex, "Unable to decrypt a stored payment credential.");
            return null;
        }
    }
}
