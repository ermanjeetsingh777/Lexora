using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface ISeatService
{
    Task<IReadOnlyCollection<SeatResponse>> GetByBranchAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default);
    Task<SeatResponse> CreateAsync(Guid institutionId, Guid branchId, CreateSeatRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<SeatResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid seatId, CancellationToken cancellationToken = default);
    Task<SeatResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid seatId, UpdateSeatRequest request, string? userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid institutionId, Guid branchId, Guid seatId, string? userId, CancellationToken cancellationToken = default);
}
