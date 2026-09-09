using SLMS_API.Application.Contracts.Payments;

namespace SLMS_API.Application.Services.Interfaces;

public interface IPaymentService
{
    PlatformPaymentStatusResponse GetPlatformStatus();

    Task<PaymentAccountResponse> GetInstitutionAccountAsync(Guid institutionId, CancellationToken cancellationToken = default);

    Task<PaymentAccountResponse> SaveInstitutionAccountAsync(
        Guid institutionId,
        SavePaymentAccountRequest request,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<PaymentInstructionResponse> InitiateMemberFeeAsync(
        Guid memberId,
        InitiateMemberFeePaymentRequest request,
        string? userId,
        CancellationToken cancellationToken = default);

    Task<PaymentInstructionResponse> InitiateSubscriptionAsync(
        string userId,
        InitiateSubscriptionPaymentRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentTransactionResponse> SubmitUpiReferenceAsync(
        Guid transactionId,
        SubmitUpiReferenceRequest request,
        string? userId,
        CancellationToken cancellationToken = default);

    Task<PaymentTransactionResponse> ApproveManualAsync(
        Guid transactionId,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<PaymentTransactionResponse> RejectAsync(
        Guid transactionId,
        RejectPaymentRequest request,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<PaymentTransactionResponse> VerifyRazorpayCheckoutAsync(
        VerifyRazorpayPaymentRequest request,
        string? userId,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    /// <summary>Server-to-server confirmation. This, not the browser callback, is the source of truth.</summary>
    Task HandleRazorpayWebhookAsync(
        string? accountToken,
        string rawBody,
        string signature,
        CancellationToken cancellationToken = default);

    /// <summary>Scoped to the caller's institutions unless they are a SuperAdmin.</summary>
    Task<IReadOnlyCollection<PaymentTransactionResponse>> ListAsync(
        PaymentTransactionFilter filter,
        string? callerUserId,
        CancellationToken cancellationToken = default);

    Task<PaymentTransactionResponse?> GetByIdAsync(Guid transactionId, CancellationToken cancellationToken = default);
}
