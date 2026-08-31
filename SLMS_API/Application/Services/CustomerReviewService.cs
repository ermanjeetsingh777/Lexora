using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.CustomerReviews;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class CustomerReviewService : ICustomerReviewService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<CustomerReviewService> _logger;

    public CustomerReviewService(
        ApplicationDbContext dbContext,
        ILogger<CustomerReviewService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<CustomerReviewResponse> SubmitReviewAsync(CreateCustomerReviewRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var review = new CustomerReview
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            OrganizationName = string.IsNullOrWhiteSpace(request.OrganizationName) ? null : request.OrganizationName.Trim(),
            Role = string.IsNullOrWhiteSpace(request.Role) ? null : request.Role.Trim(),
            Rating = Math.Clamp(request.Rating, 1, 5),
            Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim(),
            Comment = request.Comment.Trim(),
            Suggestion = string.IsNullOrWhiteSpace(request.Suggestion) ? null : request.Suggestion.Trim(),
            Status = "Pending",
            IsApproved = false,
            CreatedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };

        await _dbContext.CustomerReviews.AddAsync(review, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("New customer review submitted by {FullName} ({Email}) with rating {Rating}", review.FullName, review.Email, review.Rating);

        return MapToResponse(review);
    }

    public async Task<IReadOnlyCollection<PublicCustomerReviewResponse>> GetPublicApprovedReviewsAsync(CancellationToken cancellationToken = default)
    {
        var reviews = await _dbContext.CustomerReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsApproved && x.Status == "Approved")
            .OrderByDescending(x => x.ApprovedAtUtc ?? x.CreatedAtUtc)
            .Take(30)
            .Select(x => new PublicCustomerReviewResponse
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                OrganizationName = x.OrganizationName,
                Role = x.Role,
                Rating = x.Rating,
                Title = x.Title,
                Comment = x.Comment,
                Suggestion = x.Suggestion,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return reviews;
    }

    public async Task<IReadOnlyCollection<CustomerReviewResponse>> GetAllReviewsAsync(string? status, string? search, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.CustomerReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status.ToLower() == status.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(x =>
                x.FullName.ToLower().Contains(s) ||
                x.Email.ToLower().Contains(s) ||
                (x.OrganizationName != null && x.OrganizationName.ToLower().Contains(s)) ||
                x.Comment.ToLower().Contains(s) ||
                (x.Suggestion != null && x.Suggestion.ToLower().Contains(s)));
        }

        var list = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return list.Select(MapToResponse).ToList();
    }

    public async Task<CustomerReviewResponse> ApproveReviewAsync(Guid id, ApproveCustomerReviewRequest request, string? approverUserId, CancellationToken cancellationToken = default)
    {
        var review = await _dbContext.CustomerReviews
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new KeyNotFoundException("Customer review not found.");

        review.IsApproved = true;
        review.Status = "Approved";
        review.ApprovedAtUtc = DateTime.UtcNow;
        review.ApprovedByUserId = approverUserId;
        review.UpdatedAtUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.AdminRemarks))
        {
            review.AdminRemarks = request.AdminRemarks.Trim();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Customer review {Id} approved by user {ApproverId}", review.Id, approverUserId);

        return MapToResponse(review);
    }

    public async Task<CustomerReviewResponse> RejectReviewAsync(Guid id, RejectCustomerReviewRequest request, string? approverUserId, CancellationToken cancellationToken = default)
    {
        var review = await _dbContext.CustomerReviews
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new KeyNotFoundException("Customer review not found.");

        review.IsApproved = false;
        review.Status = "Rejected";
        review.RejectedAtUtc = DateTime.UtcNow;
        review.ApprovedByUserId = approverUserId;
        review.UpdatedAtUtc = DateTime.UtcNow;
        review.AdminRemarks = request.AdminRemarks?.Trim();

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Customer review {Id} rejected by user {ApproverId}", review.Id, approverUserId);

        return MapToResponse(review);
    }

    public async Task<bool> DeleteReviewAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var review = await _dbContext.CustomerReviews
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (review == null)
        {
            return false;
        }

        review.IsDeleted = true;
        review.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static CustomerReviewResponse MapToResponse(CustomerReview entity) =>
        new()
        {
            Id = entity.Id,
            FullName = entity.FullName,
            Email = entity.Email,
            OrganizationName = entity.OrganizationName,
            Role = entity.Role,
            Rating = entity.Rating,
            Title = entity.Title,
            Comment = entity.Comment,
            Suggestion = entity.Suggestion,
            Status = entity.Status,
            IsApproved = entity.IsApproved,
            AdminRemarks = entity.AdminRemarks,
            ApprovedAtUtc = entity.ApprovedAtUtc,
            CreatedAtUtc = entity.CreatedAtUtc
        };
}
