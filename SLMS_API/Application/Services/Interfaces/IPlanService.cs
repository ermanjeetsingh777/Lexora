using SLMS_API.Application.Contracts.Plan;

namespace SLMS_API.Application.Services.Interfaces
{
    public interface IPlanService
    {
        Task<IReadOnlyCollection<PlanResponse>> GetByLibraryAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default);
        Task<PlanResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, CancellationToken cancellationToken = default);
        Task<PlanResponse> CreateAsync(Guid institutionId, Guid branchId, Guid libraryId, CreatePlanRequest request, string? userId, CancellationToken cancellationToken = default);
        Task<PlanResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, UpdatePlanRequest request, string? userId, CancellationToken cancellationToken = default);
        Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, string? userId, CancellationToken cancellationToken = default);
        Task<PlanResponse> SetActiveStatusAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, bool isActive, string? userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyCollection<PlanResponse>> BulkCreateAsync(Guid institutionId, Guid branchId, Guid libraryId, IReadOnlyCollection<CreatePlanRequest> requests, string? userId, CancellationToken cancellationToken = default);
    }
}
