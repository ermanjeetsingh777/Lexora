using SLMS_API.Application.Contracts.CustomerReviews;

namespace SLMS_API.Application.Services.Interfaces;

public interface ICustomerReviewService
{
    Task<CustomerReviewResponse> SubmitReviewAsync(CreateCustomerReviewRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<PublicCustomerReviewResponse>> GetPublicApprovedReviewsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CustomerReviewResponse>> GetAllReviewsAsync(string? status, string? search, CancellationToken cancellationToken = default);
    Task<CustomerReviewResponse> ApproveReviewAsync(Guid id, ApproveCustomerReviewRequest request, string? approverUserId, CancellationToken cancellationToken = default);
    Task<CustomerReviewResponse> RejectReviewAsync(Guid id, RejectCustomerReviewRequest request, string? approverUserId, CancellationToken cancellationToken = default);
    Task<bool> DeleteReviewAsync(Guid id, CancellationToken cancellationToken = default);
}
