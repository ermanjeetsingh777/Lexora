using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Payments;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentService paymentService,
        ICurrentUserService currentUserService,
        ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    private string? IpAddress => HttpContext.Connection.RemoteIpAddress?.ToString();

    /// <summary>Tells the UI whether to offer "pay now" or only the offline route.</summary>
    [HttpGet("platform/status")]
    public ActionResult<ApiResponse<PlatformPaymentStatusResponse>> GetPlatformStatus()
    {
        return Ok(ApiResponse<PlatformPaymentStatusResponse>.Ok(_paymentService.GetPlatformStatus()));
    }

    #region Collection settings

    [HttpGet("institutions/{institutionId:guid}/account")]
    [Permission(PermissionKey.SettingsView)]
    public async Task<ActionResult<ApiResponse<PaymentAccountResponse>>> GetAccount(Guid institutionId, CancellationToken cancellationToken)
    {
        var account = await _paymentService.GetInstitutionAccountAsync(institutionId, cancellationToken);
        return Ok(ApiResponse<PaymentAccountResponse>.Ok(account));
    }

    [HttpPut("institutions/{institutionId:guid}/account")]
    [Permission(PermissionKey.SettingsUpdate)]
    public async Task<ActionResult<ApiResponse<PaymentAccountResponse>>> SaveAccount(
        Guid institutionId,
        [FromBody] SavePaymentAccountRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var account = await _paymentService.SaveInstitutionAccountAsync(
                institutionId,
                request,
                _currentUserService.UserId,
                IpAddress,
                cancellationToken);

            return Ok(ApiResponse<PaymentAccountResponse>.Ok(account, "Payment settings saved."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentAccountResponse>.Fail(ex.Message));
        }
    }

    #endregion

    #region Starting a payment

    [HttpPost("member-fees/{memberId:guid}/initiate")]
    public async Task<ActionResult<ApiResponse<PaymentInstructionResponse>>> InitiateMemberFee(
        Guid memberId,
        [FromBody] InitiateMemberFeePaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var instruction = await _paymentService.InitiateMemberFeeAsync(
                memberId,
                request,
                _currentUserService.UserId,
                cancellationToken);

            return Ok(ApiResponse<PaymentInstructionResponse>.Ok(instruction));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentInstructionResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("subscription/initiate")]
    public async Task<ActionResult<ApiResponse<PaymentInstructionResponse>>> InitiateSubscription(
        [FromBody] InitiateSubscriptionPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<PaymentInstructionResponse>.Fail("Sign in to continue."));
        }

        try
        {
            var instruction = await _paymentService.InitiateSubscriptionAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<PaymentInstructionResponse>.Ok(instruction));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentInstructionResponse>.Fail(ex.Message));
        }
    }

    #endregion

    #region Confirming a payment

    [HttpPost("razorpay/verify")]
    public async Task<ActionResult<ApiResponse<PaymentTransactionResponse>>> VerifyRazorpay(
        [FromBody] VerifyRazorpayPaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var transaction = await _paymentService.VerifyRazorpayCheckoutAsync(
                request,
                _currentUserService.UserId,
                IpAddress,
                cancellationToken);

            return Ok(ApiResponse<PaymentTransactionResponse>.Ok(transaction, "Payment successful."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentTransactionResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{transactionId:guid}/upi-reference")]
    public async Task<ActionResult<ApiResponse<PaymentTransactionResponse>>> SubmitUpiReference(
        Guid transactionId,
        [FromBody] SubmitUpiReferenceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var transaction = await _paymentService.SubmitUpiReferenceAsync(
                transactionId,
                request,
                _currentUserService.UserId,
                cancellationToken);

            return Ok(ApiResponse<PaymentTransactionResponse>.Ok(
                transaction,
                "Reference submitted. The library will confirm your payment shortly."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentTransactionResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{transactionId:guid}/approve")]
    [Permission(PermissionKey.PaymentsUpdate)]
    public async Task<ActionResult<ApiResponse<PaymentTransactionResponse>>> Approve(Guid transactionId, CancellationToken cancellationToken)
    {
        try
        {
            var transaction = await _paymentService.ApproveManualAsync(
                transactionId,
                _currentUserService.UserId,
                IpAddress,
                cancellationToken);

            return Ok(ApiResponse<PaymentTransactionResponse>.Ok(transaction, "Payment confirmed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentTransactionResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{transactionId:guid}/reject")]
    [Permission(PermissionKey.PaymentsUpdate)]
    public async Task<ActionResult<ApiResponse<PaymentTransactionResponse>>> Reject(
        Guid transactionId,
        [FromBody] RejectPaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var transaction = await _paymentService.RejectAsync(
                transactionId,
                request,
                _currentUserService.UserId,
                IpAddress,
                cancellationToken);

            return Ok(ApiResponse<PaymentTransactionResponse>.Ok(transaction, "Payment rejected."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PaymentTransactionResponse>.Fail(ex.Message));
        }
    }

    #endregion

    #region Ledger

    [HttpGet]
    [Permission(PermissionKey.PaymentsList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PaymentTransactionResponse>>>> List(
        [FromQuery] Guid? institutionId,
        [FromQuery] Guid? memberId,
        [FromQuery] PaymentPurpose? purpose,
        [FromQuery] PaymentStatus? status,
        [FromQuery] string? search,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var transactions = await _paymentService.ListAsync(new PaymentTransactionFilter
        {
            InstitutionId = institutionId,
            MemberId = memberId,
            Purpose = purpose,
            Status = status,
            Search = search,
            Take = take
        }, _currentUserService.UserId, cancellationToken);

        return Ok(ApiResponse<IReadOnlyCollection<PaymentTransactionResponse>>.Ok(transactions));
    }

    [HttpGet("{transactionId:guid}")]
    public async Task<ActionResult<ApiResponse<PaymentTransactionResponse>>> GetById(Guid transactionId, CancellationToken cancellationToken)
    {
        var transaction = await _paymentService.GetByIdAsync(transactionId, cancellationToken);

        return transaction is null
            ? NotFound(ApiResponse<PaymentTransactionResponse>.Fail("Payment not found."))
            : Ok(ApiResponse<PaymentTransactionResponse>.Ok(transaction));
    }

    #endregion

    /// <summary>
    /// Razorpay calls this server-to-server. The token in the path says whose webhook
    /// secret verifies the body: each institution has its own account and its own secret.
    /// </summary>
    [HttpPost("webhook/razorpay/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> RazorpayWebhook(string token, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync(cancellationToken);
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();

        try
        {
            await _paymentService.HandleRazorpayWebhookAsync(token, rawBody, signature, cancellationToken);
            return Ok(new { received = true });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Rejected a Razorpay webhook.");
            return BadRequest(new { received = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            // Returning 500 makes Razorpay retry, which is what we want for transient faults.
            _logger.LogError(ex, "Razorpay webhook processing failed.");
            throw;
        }
    }
}
