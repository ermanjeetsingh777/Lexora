using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface IInstitutionService
{
    Task<InstitutionResponse> CreateAsync(CreateInstitutionRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<InstitutionCardResponse?> GetInstitutionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<InstitutionResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<InstitutionListViewResponse> GetListViewAsync(InstitutionListQuery query, Guid userId, CancellationToken cancellationToken = default);
    Task<InstitutionOverviewResponse?> GetOverviewAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<InstitutionBillingResponse?> GetBillingAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<InstitutionBranchesViewResponse?> GetBranchesViewAsync(Guid id, InstitutionBranchListQuery query, Guid userId, CancellationToken cancellationToken = default);
    Task<InstitutionLibrariesViewResponse?> GetLibrariesViewAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<InstitutionResponse?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);    
    Task<InstitutionResponse> UpdateAsync(Guid id, UpdateInstitutionRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, string? userId, CancellationToken cancellationToken = default);
    Task<InstitutionQuickViewResponse?> GetQuickViewAsync(Guid id, Guid userId, InstitutionQuickViewQuery query, CancellationToken cancellationToken = default);
    Task<OrganizationAnalyticsResponse> GetAnalyticsAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<List<InstitutionDropdownResponse>> GetInstitutionDropdownAsync( Guid userId, CancellationToken cancellationToken = default);

}
