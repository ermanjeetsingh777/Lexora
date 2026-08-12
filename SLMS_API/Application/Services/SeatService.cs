using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Application.Services;

public class SeatService : ISeatService
{
    public Task<SeatResponse> CreateAsync(Guid institutionId, Guid branchId, CreateSeatRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(Guid institutionId, Guid branchId, Guid seatId, string? userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<SeatResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid seatId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyCollection<SeatResponse>> GetByBranchAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<SeatResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid seatId, UpdateSeatRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}
