using SLMS_API.Application.Contracts.Dashboard;

namespace SLMS_API.Application.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardOverviewResponse> GetOverviewAsync(DashboardQuery query, Guid userId, CancellationToken cancellationToken = default);
    Task<DashboardRevenueResponse> GetRevenueAsync(DashboardQuery query, Guid userId, CancellationToken cancellationToken = default);
    Task<DashboardActivityResponse> GetActivityAsync(DashboardActivityQuery query, Guid userId, CancellationToken cancellationToken = default);
}
