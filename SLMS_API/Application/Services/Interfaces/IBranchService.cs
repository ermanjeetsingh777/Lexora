using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface IBranchService
{
    Task<IReadOnlyCollection<BranchResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default);
    Task<BranchResponse?> GetByIdAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default);
    Task<BranchResponse> CreateAsync(Guid institutionId, CreateBranchRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<BranchResponse> UpdateAsync(Guid institutionId, Guid branchId, UpdateBranchRequest request, string? userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid institutionId, Guid branchId, string? userId, CancellationToken cancellationToken = default);
    Task<OrganizationAnalyticsResponse> GetAnalyticsAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default);
}
