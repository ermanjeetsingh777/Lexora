using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QRCoder;
using SLMS_API.Application.Contracts.Addon;
using SLMS_API.Application.Contracts.Admin;
using SLMS_API.Application.Contracts.PackageSubscription;
using SLMS_API.Application.Contracts.Payments;
using SLMS_API.Application.Options;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.Payments;

namespace SLMS_API.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IRazorpayClient _razorpayClient;
    private readonly ISecretProtector _secretProtector;
    private readonly IAuditLogService _auditLogService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RazorpayOptions _platformOptions;
    private readonly bool _isProduction;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        ApplicationDbContext dbContext,
        IRazorpayClient razorpayClient,
        ISecretProtector secretProtector,
        IAuditLogService auditLogService,
        IServiceScopeFactory scopeFactory,
        IOptions<RazorpayOptions> platformOptions,
        IHostEnvironment hostEnvironment,
        ILogger<PaymentService> logger)
    {
        _dbContext = dbContext;
        _razorpayClient = razorpayClient;
        _secretProtector = secretProtector;
        _auditLogService = auditLogService;
        _scopeFactory = scopeFactory;
        _platformOptions = platformOptions.Value;
        _isProduction = hostEnvironment.IsProduction();
        _logger = logger;
    }

    public PlatformPaymentStatusResponse GetPlatformStatus()
    {
        return new PlatformPaymentStatusResponse
        {
            Enabled = _platformOptions.Enabled
                && !string.IsNullOrWhiteSpace(_platformOptions.KeyId)
                && !string.IsNullOrWhiteSpace(_platformOptions.KeySecret),
            DisplayName = _platformOptions.DisplayName,
            Currency = _platformOptions.Currency,
            IsTestMode = RazorpayKeys.IsTestKey(_platformOptions.KeyId)
        };
    }

    #region Institution payment account

    public async Task<PaymentAccountResponse> GetInstitutionAccountAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        var account = await _dbContext.PaymentAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && !x.IsDeleted, cancellationToken);

        return account is null
            ? new PaymentAccountResponse { InstitutionId = institutionId, Mode = PaymentAccountMode.None }
            : MapAccount(account);
    }

    public async Task<PaymentAccountResponse> SaveInstitutionAccountAsync(
        Guid institutionId,
        SavePaymentAccountRequest request,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var institutionExists = await _dbContext.Institutions
            .AnyAsync(x => x.Id == institutionId && !x.IsDeleted, cancellationToken);

        if (!institutionExists)
        {
            throw new InvalidOperationException("Institution not found.");
        }

        var account = await _dbContext.PaymentAccounts
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId, cancellationToken);

        if (account is null)
        {
            account = new PaymentAccount
            {
                InstitutionId = institutionId,
                WebhookToken = GenerateToken(),
                CreatedBy = userId
            };
            _dbContext.PaymentAccounts.Add(account);
        }

        account.Mode = request.Mode;
        account.IsActive = request.IsActive;
        account.UpiPayeeName = Trim(request.UpiPayeeName);
        account.UpiVpa = Trim(request.UpiVpa);
        account.RazorpayKeyId = Trim(request.RazorpayKeyId);
        account.UpdatedAtUtc = DateTime.UtcNow;
        account.UpdatedBy = userId;

        // Blank secret means "keep what is stored" — the UI never receives the old value
        // back, so it cannot echo it to us.
        if (!string.IsNullOrWhiteSpace(request.RazorpayKeySecret))
        {
            account.RazorpayKeySecretProtected = _secretProtector.Protect(request.RazorpayKeySecret!.Trim());
        }

        if (!string.IsNullOrWhiteSpace(request.RazorpayWebhookSecret))
        {
            account.RazorpayWebhookSecretProtected = _secretProtector.Protect(request.RazorpayWebhookSecret!.Trim());
        }

        ValidateAccount(account);

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.WriteAsync(
            AuditEventTypes.PaymentAccountUpdate,
            userId,
            $"Payment collection for institution {institutionId} set to {account.Mode}.",
            ipAddress,
            cancellationToken);

        return MapAccount(account);
    }

    private void ValidateAccount(PaymentAccount account)
    {
        switch (account.Mode)
        {
            case PaymentAccountMode.UpiManual:
                if (string.IsNullOrWhiteSpace(account.UpiVpa))
                {
                    throw new InvalidOperationException("A UPI ID is required for UPI collection.");
                }

                if (!account.UpiVpa.Contains('@', StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("Enter a valid UPI ID, for example library@okhdfcbank.");
                }

                if (string.IsNullOrWhiteSpace(account.UpiPayeeName))
                {
                    throw new InvalidOperationException("A payee name is required so members can recognise the transfer.");
                }

                break;

            case PaymentAccountMode.Razorpay:
                if (string.IsNullOrWhiteSpace(account.RazorpayKeyId))
                {
                    throw new InvalidOperationException("Razorpay key id is required.");
                }

                if (string.IsNullOrWhiteSpace(account.RazorpayKeySecretProtected))
                {
                    throw new InvalidOperationException("Razorpay key secret is required.");
                }

                var mismatch = RazorpayKeys.DescribeMismatch(account.RazorpayKeyId, _isProduction);
                if (mismatch is not null)
                {
                    throw new InvalidOperationException(mismatch);
                }

                break;
        }
    }

    #endregion

    #region Initiating payments

    public async Task<PaymentInstructionResponse> InitiateMemberFeeAsync(
        Guid memberId,
        InitiateMemberFeePaymentRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        var member = await _dbContext.Members
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        var placement = await _dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => x.MemberId == memberId && x.IsCurrent && !x.IsDeleted)
            .OrderByDescending(x => x.JoinedOn)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("This member is not assigned to a library yet.");

        var plan = await _dbContext.MemberPlans
            .Where(x => x.MemberId == memberId && !x.IsDeleted)
            .Where(x => request.MemberPlanId == null || x.Id == request.MemberPlanId)
            .OrderByDescending(x => x.IsCurrent)
            .ThenByDescending(x => x.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        var due = plan?.DueAmount ?? 0m;
        var amount = request.Amount ?? due;

        if (amount <= 0)
        {
            throw new InvalidOperationException("There are no dues to collect for this member.");
        }

        if (plan is not null && amount > due && due > 0)
        {
            throw new InvalidOperationException($"Amount cannot be more than the outstanding dues ({due:0.00}).");
        }

        var account = await _dbContext.PaymentAccounts
            .FirstOrDefaultAsync(x => x.InstitutionId == placement.InstitutionId && !x.IsDeleted, cancellationToken);

        if (account is null || !IsReadyToCollect(account))
        {
            throw new InvalidOperationException(
                "Online collection is not set up for this institution yet. Add a UPI ID or gateway keys in payment settings.");
        }

        var transaction = new PaymentTransaction
        {
            Purpose = PaymentPurpose.MemberFee,
            Reference = GenerateReference(),
            InstitutionId = placement.InstitutionId,
            PaymentAccountId = account.Id,
            MemberId = member.Id,
            MemberPlanId = plan?.Id,
            UserId = member.UserId,
            Amount = amount,
            Currency = "INR",
            PayerName = member.FullName,
            PayerEmail = member.User?.Email,
            PayerPhone = member.PhoneNumber,
            Note = Trim(request.Note) ?? "Library membership fee",
            CreatedBy = userId
        };

        return await BuildInstructionAsync(transaction, account, cancellationToken);
    }

    public async Task<PaymentInstructionResponse> InitiateSubscriptionAsync(
        string userId,
        InitiateSubscriptionPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsurePlatformGatewayIsUsable();

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        var userPackage = await _dbContext.UserPackages
            .Include(x => x.Package)
            .Where(x => x.UserId == userId)
            .Where(x => request.UserPackageId == null || x.Id == request.UserPackageId)
            // Without an explicit id, a waiting renew/upgrade request is what the tenant means
            // to pay — their settled current package would otherwise win on date alone.
            .OrderByDescending(x => x.ApprovalStatus == "Pending")
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("No subscription found for this account.");

        // A "Paid" stamp on its own is not proof of payment: registration used to mark every
        // package paid the moment it was selected. What settles a subscription is a captured
        // payment, or a SuperAdmin approval that also made the tenant live.
        var alreadyCaptured = await _dbContext.PaymentTransactions
            .AnyAsync(
                x => x.UserPackageId == userPackage.Id && x.Status == PaymentStatus.Captured,
                cancellationToken);

        var packageIsSettled = string.Equals(userPackage.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(userPackage.ApprovalStatus, "Pending", StringComparison.OrdinalIgnoreCase);

        var tenantIsLive = string.Equals(user.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase)
            && packageIsSettled;

        if (alreadyCaptured || tenantIsLive)
        {
            throw new InvalidOperationException("This subscription is already paid.");
        }

        // A renew/upgrade request already carries its own price, worked out with any prorated
        // credit, and it does not drag the tenant's separate add-on requests along with it.
        // A first registration has no such figure, so the plan price plus whatever add-ons were
        // picked at signup is what is owed.
        var isChangeRequest = !string.IsNullOrWhiteSpace(userPackage.RequestType)
            && string.Equals(userPackage.ApprovalStatus, "Pending", StringComparison.OrdinalIgnoreCase);

        decimal amount;
        string note;

        if (isChangeRequest)
        {
            amount = userPackage.FinalApprovedAmount ?? userPackage.AmountPaid;
            note = $"Lexora {userPackage.RequestType?.ToLowerInvariant()} — {userPackage.Package?.Name ?? "Plan"}";
        }
        else
        {
            var addonTotal = await _dbContext.UserPackageAddons
                .Where(x => x.UserId == userId && x.ApprovalStatus != "Rejected")
                .SumAsync(x => (decimal?)x.AmountPaid, cancellationToken) ?? 0m;

            amount = userPackage.FinalApprovedAmount
                ?? ((userPackage.Package?.Price ?? userPackage.AmountPaid) + addonTotal);
            note = $"Lexora subscription — {userPackage.Package?.Name ?? "Plan"}";
        }

        if (amount <= 0)
        {
            throw new InvalidOperationException("This plan has nothing to pay.");
        }

        var transaction = new PaymentTransaction
        {
            Purpose = PaymentPurpose.TenantSubscription,
            Reference = GenerateReference(),
            UserId = userId,
            UserPackageId = userPackage.Id,
            Amount = amount,
            Currency = _platformOptions.Currency,
            PayerName = user.FullName,
            PayerEmail = user.Email,
            PayerPhone = user.PhoneNumber,
            Note = note,
            CreatedBy = userId
        };

        return await BuildInstructionAsync(transaction, account: null, cancellationToken);
    }

    public async Task<PaymentInstructionResponse> InitiateAddonAsync(
        Guid userPackageAddonId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        EnsurePlatformGatewayIsUsable();

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        var userAddon = await _dbContext.UserPackageAddons
            .Include(x => x.Addon)
            .FirstOrDefaultAsync(x => x.Id == userPackageAddonId, cancellationToken)
            ?? throw new InvalidOperationException("Add-on request not found.");

        if (!string.Equals(userAddon.UserId, userId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("This add-on request belongs to another account.");
        }

        if (string.Equals(userAddon.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("This add-on is already active.");
        }

        if (string.Equals(userAddon.ApprovalStatus, "Rejected", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("This add-on request was declined. Please raise a new one.");
        }

        var alreadyCaptured = await _dbContext.PaymentTransactions
            .AnyAsync(
                x => x.UserPackageAddonId == userAddon.Id && x.Status == PaymentStatus.Captured,
                cancellationToken);

        if (alreadyCaptured)
        {
            throw new InvalidOperationException("This add-on is already paid.");
        }

        var amount = userAddon.FinalApprovedAmount ?? userAddon.AmountPaid;
        if (amount <= 0)
        {
            throw new InvalidOperationException("This add-on has nothing to pay.");
        }

        var transaction = new PaymentTransaction
        {
            Purpose = PaymentPurpose.TenantAddon,
            Reference = GenerateReference(),
            UserId = userId,
            UserPackageId = userAddon.UserPackageId,
            UserPackageAddonId = userAddon.Id,
            Amount = amount,
            Currency = _platformOptions.Currency,
            PayerName = user.FullName,
            PayerEmail = user.Email,
            PayerPhone = user.PhoneNumber,
            Note = $"Lexora add-on — {userAddon.Addon?.Name ?? "Extra capacity"}",
            CreatedBy = userId
        };

        return await BuildInstructionAsync(transaction, account: null, cancellationToken);
    }

    /// <summary>
    /// Lexora's own gateway has to be switched on and keyed for the environment before a
    /// tenant can be sent to checkout; otherwise they stay on the offline route.
    /// </summary>
    private void EnsurePlatformGatewayIsUsable()
    {
        if (!_platformOptions.Enabled ||
            string.IsNullOrWhiteSpace(_platformOptions.KeyId) ||
            string.IsNullOrWhiteSpace(_platformOptions.KeySecret))
        {
            throw new InvalidOperationException(
                "Online payment is not enabled. Please use the offline payment option.");
        }

        var keyMismatch = RazorpayKeys.DescribeMismatch(_platformOptions.KeyId, _isProduction);
        if (keyMismatch is not null)
        {
            _logger.LogError("Platform Razorpay key does not match this environment. {Detail}", keyMismatch);
            throw new InvalidOperationException(
                "Online payment is misconfigured on the server. Please use the offline payment option.");
        }
    }

    /// <summary>
    /// Creates the ledger row and returns whatever the payer needs. The caller does not
    /// branch on mode — that decision lives here and in the stored account.
    /// </summary>
    private async Task<PaymentInstructionResponse> BuildInstructionAsync(
        PaymentTransaction transaction,
        PaymentAccount? account,
        CancellationToken cancellationToken)
    {
        var mode = account?.Mode ?? PaymentAccountMode.Razorpay;
        var response = new PaymentInstructionResponse
        {
            Reference = transaction.Reference,
            Mode = mode,
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Note = transaction.Note
        };

        if (mode == PaymentAccountMode.UpiManual)
        {
            transaction.Provider = PaymentProvider.Upi;
            transaction.Status = PaymentStatus.Created;

            var upiUri = BuildUpiUri(account!.UpiVpa!, account.UpiPayeeName!, transaction.Amount, transaction.Reference);

            response.Provider = PaymentProvider.Upi;
            response.Upi = new UpiPaymentInstruction
            {
                Vpa = account.UpiVpa!,
                PayeeName = account.UpiPayeeName!,
                TransactionNote = transaction.Reference,
                PaymentUri = upiUri,
                QrCodeBase64 = GenerateQrCodeBase64(upiUri)
            };
        }
        else
        {
            var credentials = account is null
                ? new RazorpayCredentials(_platformOptions.KeyId!, _platformOptions.KeySecret!)
                : ResolveInstitutionCredentials(account);

            var order = await _razorpayClient.CreateOrderAsync(
                credentials,
                transaction.Amount,
                transaction.Currency,
                transaction.Reference,
                new Dictionary<string, string>
                {
                    ["reference"] = transaction.Reference,
                    ["purpose"] = transaction.Purpose.ToString()
                },
                cancellationToken);

            transaction.Provider = PaymentProvider.Razorpay;
            transaction.ProviderOrderId = order.OrderId;
            transaction.Status = PaymentStatus.Created;

            response.Provider = PaymentProvider.Razorpay;
            response.Mode = PaymentAccountMode.Razorpay;
            response.Razorpay = new RazorpayPaymentInstruction
            {
                KeyId = credentials.KeyId,
                OrderId = order.OrderId,
                AmountInPaise = order.AmountInPaise,
                DisplayName = account is null ? _platformOptions.DisplayName : account.UpiPayeeName ?? "Library fees",
                IsTestMode = RazorpayKeys.IsTestKey(credentials.KeyId),
                PrefillName = transaction.PayerName,
                PrefillEmail = transaction.PayerEmail,
                PrefillContact = transaction.PayerPhone
            };
        }

        _dbContext.PaymentTransactions.Add(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        response.TransactionId = transaction.Id;
        return response;
    }

    private RazorpayCredentials ResolveInstitutionCredentials(PaymentAccount account)
    {
        var secret = _secretProtector.Unprotect(account.RazorpayKeySecretProtected);

        if (string.IsNullOrWhiteSpace(account.RazorpayKeyId) || string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException("This institution's gateway credentials are missing or unreadable.");
        }

        return new RazorpayCredentials(account.RazorpayKeyId!, secret!);
    }

    #endregion

    #region Confirming payments

    public async Task<PaymentTransactionResponse> SubmitUpiReferenceAsync(
        Guid transactionId,
        SubmitUpiReferenceRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        var utr = Trim(request.Utr);
        if (string.IsNullOrWhiteSpace(utr))
        {
            throw new InvalidOperationException("Enter the UPI reference / UTR number shown in your payment app.");
        }

        var transaction = await LoadTransactionAsync(transactionId, cancellationToken);

        if (transaction.Status is PaymentStatus.Captured or PaymentStatus.Refunded)
        {
            throw new InvalidOperationException("This payment is already settled.");
        }

        transaction.UpiUtr = utr;
        transaction.Status = PaymentStatus.AwaitingVerification;
        transaction.Note = Trim(request.Note) ?? transaction.Note;
        transaction.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await MapTransactionAsync(transaction, cancellationToken);
    }

    public async Task<PaymentTransactionResponse> ApproveManualAsync(
        Guid transactionId,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var transaction = await LoadTransactionAsync(transactionId, cancellationToken);

        if (transaction.Provider != PaymentProvider.Upi)
        {
            throw new InvalidOperationException("Gateway payments are confirmed automatically and cannot be approved by hand.");
        }

        transaction.VerifiedByUserId = userId;
        transaction.VerifiedAtUtc = DateTime.UtcNow;

        await CaptureAsync(transaction, userId, ipAddress, cancellationToken);

        return await MapTransactionAsync(transaction, cancellationToken);
    }

    public async Task<PaymentTransactionResponse> RejectAsync(
        Guid transactionId,
        RejectPaymentRequest request,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("A reason is required when rejecting a payment.");
        }

        var transaction = await LoadTransactionAsync(transactionId, cancellationToken);

        if (transaction.Status == PaymentStatus.Captured)
        {
            throw new InvalidOperationException("This payment is already captured — issue a refund instead.");
        }

        transaction.Status = PaymentStatus.Failed;
        transaction.FailureReason = request.Reason.Trim();
        transaction.VerifiedByUserId = userId;
        transaction.VerifiedAtUtc = DateTime.UtcNow;
        transaction.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.WriteAsync(
            AuditEventTypes.PaymentRejected,
            userId,
            $"Payment {transaction.Reference} rejected: {transaction.FailureReason}",
            ipAddress,
            cancellationToken);

        return await MapTransactionAsync(transaction, cancellationToken);
    }

    public async Task<PaymentTransactionResponse> VerifyRazorpayCheckoutAsync(
        VerifyRazorpayPaymentRequest request,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.PaymentTransactions
            .FirstOrDefaultAsync(x => x.ProviderOrderId == request.RazorpayOrderId, cancellationToken)
            ?? throw new InvalidOperationException("Payment not found.");

        var secret = await ResolveSecretForTransactionAsync(transaction, forWebhook: false, cancellationToken)
            ?? throw new InvalidOperationException("Gateway credentials are not available for this payment.");

        if (!_razorpayClient.VerifyCheckoutSignature(secret, request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature))
        {
            transaction.Status = PaymentStatus.Failed;
            transaction.FailureReason = "Signature verification failed.";
            transaction.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            throw new InvalidOperationException("We could not verify this payment. If money was debited it will be reconciled automatically.");
        }

        transaction.ProviderPaymentId = request.RazorpayPaymentId;
        transaction.ProviderSignature = request.RazorpaySignature;

        await CaptureAsync(transaction, userId, ipAddress, cancellationToken);

        return await MapTransactionAsync(transaction, cancellationToken);
    }

    public async Task HandleRazorpayWebhookAsync(
        string? accountToken,
        string rawBody,
        string signature,
        CancellationToken cancellationToken = default)
    {
        PaymentAccount? account = null;
        string? webhookSecret;

        if (string.IsNullOrWhiteSpace(accountToken) || accountToken == "platform")
        {
            webhookSecret = _platformOptions.WebhookSecret;
        }
        else
        {
            account = await _dbContext.PaymentAccounts
                .FirstOrDefaultAsync(x => x.WebhookToken == accountToken && !x.IsDeleted, cancellationToken);

            if (account is null)
            {
                _logger.LogWarning("Razorpay webhook received for an unknown account token.");
                throw new InvalidOperationException("Unknown webhook endpoint.");
            }

            webhookSecret = _secretProtector.Unprotect(account.RazorpayWebhookSecretProtected);
        }

        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            throw new InvalidOperationException("Webhook secret is not configured for this endpoint.");
        }

        if (!_razorpayClient.VerifyWebhookSignature(webhookSecret!, rawBody, signature))
        {
            _logger.LogWarning("Razorpay webhook signature mismatch for account {AccountId}.", account?.Id);
            throw new InvalidOperationException("Invalid webhook signature.");
        }

        using var document = JsonDocument.Parse(rawBody);
        var root = document.RootElement;
        var eventName = root.TryGetProperty("event", out var eventElement) ? eventElement.GetString() : null;

        if (!TryReadPaymentEntity(root, out var paymentEntity))
        {
            _logger.LogInformation("Ignoring Razorpay webhook event {Event} — no payment entity.", eventName);
            return;
        }

        var orderId = paymentEntity.TryGetProperty("order_id", out var orderElement) ? orderElement.GetString() : null;
        var paymentId = paymentEntity.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;

        var transaction = await _dbContext.PaymentTransactions
            .FirstOrDefaultAsync(x => x.ProviderOrderId == orderId, cancellationToken);

        if (transaction is null)
        {
            _logger.LogWarning("Razorpay webhook for unknown order {OrderId}.", orderId);
            return;
        }

        transaction.RawPayload = rawBody.Length > 8000 ? rawBody[..8000] : rawBody;
        transaction.ProviderPaymentId ??= paymentId;

        switch (eventName)
        {
            case "payment.captured":
            case "order.paid":
                await CaptureAsync(transaction, userId: null, ipAddress: null, cancellationToken);
                break;

            case "payment.failed":
                transaction.Status = PaymentStatus.Failed;
                transaction.FailureReason = paymentEntity.TryGetProperty("error_description", out var errorElement)
                    ? errorElement.GetString()
                    : "Payment failed at the gateway.";
                transaction.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
                break;

            case "refund.processed":
                transaction.Status = PaymentStatus.Refunded;
                transaction.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
                break;

            default:
                await _dbContext.SaveChangesAsync(cancellationToken);
                break;
        }
    }

    private static bool TryReadPaymentEntity(JsonElement root, out JsonElement paymentEntity)
    {
        paymentEntity = default;

        if (!root.TryGetProperty("payload", out var payload))
        {
            return false;
        }

        if (payload.TryGetProperty("payment", out var payment) &&
            payment.TryGetProperty("entity", out var entity))
        {
            paymentEntity = entity;
            return true;
        }

        if (payload.TryGetProperty("order", out var order) &&
            order.TryGetProperty("entity", out var orderEntity))
        {
            paymentEntity = orderEntity;
            return true;
        }

        return false;
    }

    /// <summary>
    /// The single place money is recognised, whoever confirmed it. Safe to call twice —
    /// gateways retry webhooks and a verifier may click while a webhook is in flight.
    /// </summary>
    private async Task CaptureAsync(
        PaymentTransaction transaction,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (transaction.Status == PaymentStatus.Captured)
        {
            return;
        }

        transaction.Status = PaymentStatus.Captured;
        transaction.CapturedAtUtc = DateTime.UtcNow;
        transaction.UpdatedAtUtc = DateTime.UtcNow;

        if (transaction.Purpose == PaymentPurpose.MemberFee)
        {
            await ApplyMemberFeeAsync(transaction, cancellationToken);
        }

        if (transaction.PaymentAccountId is Guid accountId)
        {
            var account = await _dbContext.PaymentAccounts.FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);
            if (account is not null)
            {
                account.FirstCapturedAtUtc ??= DateTime.UtcNow;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction.Purpose == PaymentPurpose.TenantSubscription)
        {
            await ActivateSubscriptionAsync(transaction, ipAddress, cancellationToken);
        }
        else if (transaction.Purpose == PaymentPurpose.TenantAddon)
        {
            await ActivateAddonAsync(transaction, ipAddress, cancellationToken);
        }

        await _auditLogService.WriteAsync(
            AuditEventTypes.PaymentCaptured,
            userId ?? transaction.UserId,
            $"Payment {transaction.Reference} captured via {transaction.Provider} for {transaction.Amount:0.00} {transaction.Currency}.",
            ipAddress,
            cancellationToken);
    }

    private async Task ApplyMemberFeeAsync(PaymentTransaction transaction, CancellationToken cancellationToken)
    {
        if (transaction.MemberPlanId is not Guid planId)
        {
            return;
        }

        var plan = await _dbContext.MemberPlans.FirstOrDefaultAsync(x => x.Id == planId, cancellationToken);
        if (plan is null)
        {
            return;
        }

        plan.PaidAmount += transaction.Amount;
        plan.DueAmount = Math.Max(0, plan.DueAmount - transaction.Amount);
        plan.UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// A paid subscription is an approval — it runs the same activation the SuperAdmin
    /// console does, so packages, add-ons, onboarding step and the approval email all
    /// behave identically whether the money arrived online or offline.
    /// </summary>
    private async Task ActivateSubscriptionAsync(PaymentTransaction transaction, string? ipAddress, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(transaction.UserId))
        {
            return;
        }

        var isChangeRequest = false;

        if (transaction.UserPackageId is Guid userPackageId)
        {
            var userPackage = await _dbContext.UserPackages.FirstOrDefaultAsync(x => x.Id == userPackageId, cancellationToken);
            if (userPackage is not null)
            {
                isChangeRequest = !string.IsNullOrWhiteSpace(userPackage.RequestType)
                    && string.Equals(userPackage.ApprovalStatus, "Pending", StringComparison.OrdinalIgnoreCase);

                userPackage.PaymentStatus = "Paid";
                userPackage.PaymentMethod = transaction.Provider.ToString();
                userPackage.TransactionId = transaction.ProviderPaymentId ?? transaction.Reference;
                userPackage.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        // A renew or upgrade is not a registration: it has to retire the old package, take over
        // as the current one and recompute its dates. Only the subscription approval does that,
        // and it must not sweep in add-ons the tenant has not paid for.
        if (isChangeRequest)
        {
            try
            {
                using var changeScope = _scopeFactory.CreateScope();
                var subscriptions = changeScope.ServiceProvider.GetRequiredService<IPackageSubscriptionService>();

                await subscriptions.ApproveSubscriptionRequestAsync(
                    transaction.UserPackageId!.Value,
                    new ApproveSubscriptionRequest
                    {
                        FinalApprovedAmount = transaction.Amount,
                        AdminRemarks = $"Paid online — {transaction.Provider} {transaction.ProviderPaymentId ?? transaction.Reference}",
                        ApproveLinkedAddons = false
                    },
                    approverUserId: transaction.UserId!,
                    ipAddress,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payment {Reference} captured but the plan change could not be activated.", transaction.Reference);
            }

            return;
        }

        try
        {
            // Resolved from a new scope: AdminService owns its own DbContext and this
            // path can run from a webhook with no request scope of its own.
            using var scope = _scopeFactory.CreateScope();
            var adminService = scope.ServiceProvider.GetRequiredService<IAdminService>();

            await adminService.ApproveTenantRegistrationAsync(
                transaction.UserId!,
                new ApproveTenantRegistrationRequest
                {
                    FinalAmount = transaction.Amount,
                    Remarks = $"Paid online — {transaction.Provider} {transaction.ProviderPaymentId ?? transaction.Reference}"
                },
                approverUserId: transaction.UserId!,
                ipAddress,
                cancellationToken);
        }
        catch (Exception ex)
        {
            // The money is already recorded; activation can be retried from the console.
            _logger.LogError(ex, "Payment {Reference} captured but tenant activation failed.", transaction.Reference);
        }
    }

    /// <summary>
    /// A paid add-on runs the same approval the SuperAdmin console does, so the extra quota
    /// lands on the tenant's account without anyone having to check a payment slip.
    /// </summary>
    private async Task ActivateAddonAsync(PaymentTransaction transaction, string? ipAddress, CancellationToken cancellationToken)
    {
        if (transaction.UserPackageAddonId is not Guid addonId || string.IsNullOrWhiteSpace(transaction.UserId))
        {
            return;
        }

        var userAddon = await _dbContext.UserPackageAddons.FirstOrDefaultAsync(x => x.Id == addonId, cancellationToken);
        if (userAddon is not null)
        {
            userAddon.PaymentMethod = transaction.Provider.ToString();
            userAddon.TransactionId = transaction.ProviderPaymentId ?? transaction.Reference;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var addonService = scope.ServiceProvider.GetRequiredService<IAddonService>();

            await addonService.ApproveAddonRequestAsync(
                addonId,
                new ApproveAddonRequest
                {
                    FinalAmount = transaction.Amount,
                    Remarks = $"Paid online — {transaction.Provider} {transaction.ProviderPaymentId ?? transaction.Reference}"
                },
                approverUserId: transaction.UserId!,
                ipAddress,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Payment {Reference} captured but the add-on could not be activated.", transaction.Reference);
        }
    }

    private async Task<string?> ResolveSecretForTransactionAsync(
        PaymentTransaction transaction,
        bool forWebhook,
        CancellationToken cancellationToken)
    {
        if (transaction.PaymentAccountId is not Guid accountId)
        {
            return forWebhook ? _platformOptions.WebhookSecret : _platformOptions.KeySecret;
        }

        var account = await _dbContext.PaymentAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == accountId, cancellationToken);

        if (account is null)
        {
            return null;
        }

        return _secretProtector.Unprotect(
            forWebhook ? account.RazorpayWebhookSecretProtected : account.RazorpayKeySecretProtected);
    }

    #endregion

    #region Reads

    public async Task<IReadOnlyCollection<PaymentTransactionResponse>> ListAsync(
        PaymentTransactionFilter filter,
        string? callerUserId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.PaymentTransactions.AsNoTracking().AsQueryable();

        // Anyone below SuperAdmin sees only their own institutions' payments (and their
        // own subscription payments), whatever institution id they ask for.
        if (!await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            var accessibleInstitutionIds = await _dbContext.UserInstitutions
                .AsNoTracking()
                .Where(x => x.UserId == callerUserId && x.IsActive)
                .Select(x => x.InstitutionId)
                .ToListAsync(cancellationToken);

            query = query.Where(x =>
                (x.InstitutionId != null && accessibleInstitutionIds.Contains(x.InstitutionId.Value)) ||
                x.UserId == callerUserId);
        }

        if (filter.InstitutionId is Guid institutionId)
        {
            query = query.Where(x => x.InstitutionId == institutionId);
        }

        if (filter.MemberId is Guid memberId)
        {
            query = query.Where(x => x.MemberId == memberId);
        }

        if (filter.Purpose is PaymentPurpose purpose)
        {
            query = query.Where(x => x.Purpose == purpose);
        }

        if (filter.Status is PaymentStatus status)
        {
            query = query.Where(x => x.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            query = query.Where(x =>
                x.Reference.Contains(term) ||
                (x.PayerName != null && x.PayerName.Contains(term)) ||
                (x.UpiUtr != null && x.UpiUtr.Contains(term)) ||
                (x.ProviderPaymentId != null && x.ProviderPaymentId.Contains(term)));
        }

        var take = Math.Clamp(filter.Take, 1, 500);

        var transactions = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

        return await MapTransactionsAsync(transactions, cancellationToken);
    }

    public async Task<PaymentTransactionResponse?> GetByIdAsync(Guid transactionId, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.PaymentTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == transactionId, cancellationToken);

        return transaction is null ? null : await MapTransactionAsync(transaction, cancellationToken);
    }

    #endregion

    #region Helpers

    private async Task<bool> IsSuperAdminAsync(string? userId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        return await (
            from userRole in _dbContext.UserRoles.AsNoTracking()
            join role in _dbContext.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.UserId == userId && role.Name == RoleDefinitions.SuperAdmin
            select userRole.UserId
        ).AnyAsync(cancellationToken);
    }

    private async Task<PaymentTransaction> LoadTransactionAsync(Guid transactionId, CancellationToken cancellationToken)
    {
        return await _dbContext.PaymentTransactions.FirstOrDefaultAsync(x => x.Id == transactionId, cancellationToken)
            ?? throw new InvalidOperationException("Payment not found.");
    }

    private async Task<PaymentTransactionResponse> MapTransactionAsync(PaymentTransaction transaction, CancellationToken cancellationToken)
    {
        var mapped = await MapTransactionsAsync(new[] { transaction }, cancellationToken);
        return mapped.First();
    }

    private async Task<IReadOnlyCollection<PaymentTransactionResponse>> MapTransactionsAsync(
        IReadOnlyCollection<PaymentTransaction> transactions,
        CancellationToken cancellationToken)
    {
        var institutionIds = transactions.Where(x => x.InstitutionId.HasValue).Select(x => x.InstitutionId!.Value).Distinct().ToList();
        var memberIds = transactions.Where(x => x.MemberId.HasValue).Select(x => x.MemberId!.Value).Distinct().ToList();

        var institutionNames = institutionIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Institutions
                .Where(x => institutionIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var memberNames = memberIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Members
                .Where(x => memberIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.FullName, cancellationToken);

        return transactions.Select(x => new PaymentTransactionResponse
        {
            Id = x.Id,
            Reference = x.Reference,
            Purpose = x.Purpose,
            Provider = x.Provider,
            Status = x.Status,
            Amount = x.Amount,
            Currency = x.Currency,
            InstitutionId = x.InstitutionId,
            InstitutionName = x.InstitutionId.HasValue && institutionNames.TryGetValue(x.InstitutionId.Value, out var institutionName)
                ? institutionName
                : null,
            MemberId = x.MemberId,
            MemberName = x.MemberId.HasValue && memberNames.TryGetValue(x.MemberId.Value, out var memberName)
                ? memberName
                : null,
            PayerName = x.PayerName,
            PayerEmail = x.PayerEmail,
            PayerPhone = x.PayerPhone,
            Note = x.Note,
            ProviderOrderId = x.ProviderOrderId,
            ProviderPaymentId = x.ProviderPaymentId,
            UpiUtr = x.UpiUtr,
            FailureReason = x.FailureReason,
            VerifiedByUserId = x.VerifiedByUserId,
            VerifiedAtUtc = x.VerifiedAtUtc,
            CapturedAtUtc = x.CapturedAtUtc,
            CreatedAtUtc = x.CreatedAtUtc
        }).ToList();
    }

    private PaymentAccountResponse MapAccount(PaymentAccount account)
    {
        var baseUrl = _platformOptions.PublicApiBaseUrl?.TrimEnd('/');

        return new PaymentAccountResponse
        {
            Id = account.Id,
            InstitutionId = account.InstitutionId,
            Mode = account.Mode,
            UpiPayeeName = account.UpiPayeeName,
            UpiVpa = account.UpiVpa,
            RazorpayKeyId = account.RazorpayKeyId,
            IsTestMode = RazorpayKeys.IsTestKey(account.RazorpayKeyId),
            HasRazorpayKeySecret = !string.IsNullOrWhiteSpace(account.RazorpayKeySecretProtected),
            HasRazorpayWebhookSecret = !string.IsNullOrWhiteSpace(account.RazorpayWebhookSecretProtected),
            WebhookUrl = account.Mode == PaymentAccountMode.Razorpay && !string.IsNullOrWhiteSpace(baseUrl)
                ? $"{baseUrl}/api/v1/payments/webhook/razorpay/{account.WebhookToken}"
                : null,
            IsActive = account.IsActive,
            IsReadyToCollect = IsReadyToCollect(account),
            FirstCapturedAtUtc = account.FirstCapturedAtUtc,
            UpdatedAtUtc = account.UpdatedAtUtc
        };
    }

    private static bool IsReadyToCollect(PaymentAccount account)
    {
        if (!account.IsActive || account.IsDeleted)
        {
            return false;
        }

        return account.Mode switch
        {
            PaymentAccountMode.UpiManual => !string.IsNullOrWhiteSpace(account.UpiVpa),
            PaymentAccountMode.Razorpay => !string.IsNullOrWhiteSpace(account.RazorpayKeyId)
                && !string.IsNullOrWhiteSpace(account.RazorpayKeySecretProtected),
            _ => false
        };
    }

    private static string BuildUpiUri(string vpa, string payeeName, decimal amount, string reference)
    {
        var query = new List<string>
        {
            "pa=" + Uri.EscapeDataString(vpa),
            "pn=" + Uri.EscapeDataString(payeeName),
            "am=" + amount.ToString("0.00"),
            "cu=INR",
            "tn=" + Uri.EscapeDataString(reference),
            "tr=" + Uri.EscapeDataString(reference)
        };

        return "upi://pay?" + string.Join('&', query);
    }

    private static string GenerateQrCodeBase64(string content)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        var qr = new PngByteQRCode(data);
        return $"data:image/png;base64,{Convert.ToBase64String(qr.GetGraphic(8))}";
    }

    private static string GenerateReference()
    {
        return "LEX-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
    }

    private static string GenerateToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
    }

    private static string? Trim(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    #endregion
}
