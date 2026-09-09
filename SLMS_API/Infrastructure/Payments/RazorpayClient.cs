using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace SLMS_API.Infrastructure.Payments;

public record RazorpayCredentials(string KeyId, string KeySecret);

public record RazorpayOrder(string OrderId, long AmountInPaise, string Currency, string Status);

public interface IRazorpayClient
{
    Task<RazorpayOrder> CreateOrderAsync(
        RazorpayCredentials credentials,
        decimal amount,
        string currency,
        string receipt,
        IReadOnlyDictionary<string, string> notes,
        CancellationToken cancellationToken = default);

    /// <summary>Verifies the signature the checkout widget hands back to the browser.</summary>
    bool VerifyCheckoutSignature(string keySecret, string orderId, string paymentId, string signature);

    /// <summary>Verifies a webhook body against the secret configured on the dashboard.</summary>
    bool VerifyWebhookSignature(string webhookSecret, string rawBody, string signature);
}

public class RazorpayClient : IRazorpayClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RazorpayClient> _logger;

    public RazorpayClient(HttpClient httpClient, ILogger<RazorpayClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<RazorpayOrder> CreateOrderAsync(
        RazorpayCredentials credentials,
        decimal amount,
        string currency,
        string receipt,
        IReadOnlyDictionary<string, string> notes,
        CancellationToken cancellationToken = default)
    {
        if (amount <= 0)
        {
            throw new InvalidOperationException("Payment amount must be greater than zero.");
        }

        // Razorpay works in the smallest currency unit.
        var amountInPaise = (long)decimal.Round(amount * 100, 0, MidpointRounding.AwayFromZero);

        using var request = new HttpRequestMessage(HttpMethod.Post, "v1/orders")
        {
            Content = JsonContent(new
            {
                amount = amountInPaise,
                currency,
                receipt,
                notes,
                payment_capture = 1
            })
        };

        var basic = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{credentials.KeyId}:{credentials.KeySecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Razorpay order creation failed ({Status}): {Body}", response.StatusCode, body);

                // A 401 means the key pair itself is wrong — regenerated, expired, or from the
                // other mode. Say that plainly instead of passing on "Authentication failed",
                // which reads like the payer's own login went wrong.
                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    throw new InvalidOperationException(
                        "The payment gateway rejected these credentials. The key may have been regenerated or "
                        + "expired — update the Razorpay key id and secret, then try again.");
                }

                throw new InvalidOperationException(ExtractErrorMessage(body) ?? "Payment provider rejected the request.");
            }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        return new RazorpayOrder(
            root.GetProperty("id").GetString() ?? throw new InvalidOperationException("Provider returned no order id."),
            root.TryGetProperty("amount", out var amountElement) ? amountElement.GetInt64() : amountInPaise,
            root.TryGetProperty("currency", out var currencyElement) ? currencyElement.GetString() ?? currency : currency,
            root.TryGetProperty("status", out var statusElement) ? statusElement.GetString() ?? "created" : "created");
    }

    public bool VerifyCheckoutSignature(string keySecret, string orderId, string paymentId, string signature)
    {
        return SignaturesMatch(keySecret, $"{orderId}|{paymentId}", signature);
    }

    public bool VerifyWebhookSignature(string webhookSecret, string rawBody, string signature)
    {
        return SignaturesMatch(webhookSecret, rawBody, signature);
    }

    private static bool SignaturesMatch(string secret, string payload, string signature)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var computed = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expected = Convert.ToHexString(computed).ToLower(CultureInfo.InvariantCulture);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.Trim().ToLower(CultureInfo.InvariantCulture)));
    }

    private static StringContent JsonContent(object payload)
    {
        return new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
    }

    private static string? ExtractErrorMessage(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("description", out var description))
            {
                return description.GetString();
            }
        }
        catch (JsonException)
        {
            // Non-JSON error body — fall through to the generic message.
        }

        return null;
    }
}
