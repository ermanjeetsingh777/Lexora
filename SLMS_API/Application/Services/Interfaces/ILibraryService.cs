using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Contracts.Organizations.Queries;

namespace SLMS_API.Application.Services.Interfaces;

public interface ILibraryService
{
    Task<LibraryListViewResponse> GetListViewAsync(LibraryListQuery query, Guid userId, CancellationToken cancellationToken = default);
    Task<LibraryListRevenueSummaryResponse> GetListRevenueSummaryAsync(LibraryListQuery query, Guid userId, CancellationToken cancellationToken = default);
    Task<LibraryDetailViewResponse?> GetDetailViewAsync(Guid libraryId, Guid userId, int trendDays = 30, CancellationToken cancellationToken = default);
    Task<LibraryCalendarViewResponse?> GetCalendarViewAsync(Guid libraryId, Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task<BranchLibraryCapacitySummaryResponse> GetBranchCapacitySummaryAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<LibraryResponse>> GetByBranchAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default);
    Task<LibraryResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default);
    Task<LibraryResponse> CreateAsync(Guid institutionId, Guid branchId, CreateLibraryRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<LibraryResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid libraryId, UpdateLibraryRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<LibraryDayHoursResponse>> UpdateWeeklyHoursAsync(Guid institutionId, Guid branchId, Guid libraryId, UpdateLibraryWeeklyHoursRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<LibraryHoursExceptionResponse>> UpdateHoursExceptionsAsync(Guid institutionId, Guid branchId, Guid libraryId, UpdateLibraryHoursExceptionsRequest request, string? userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, string? userId, CancellationToken cancellationToken = default);
}
