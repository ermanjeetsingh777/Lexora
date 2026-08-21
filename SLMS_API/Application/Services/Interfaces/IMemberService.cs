using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using Microsoft.AspNetCore.Http;

namespace SLMS_API.Application.Services.Interfaces;

public interface IMemberService
{
    //Task<IReadOnlyCollection<MemberResponse>> GetByLibraryAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default);
    Task<MemberResponse> CreateAsync(Guid institutionId, Guid branchId, Guid libraryId, CreateMemberRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<MemberListResponse>> GetLibraryMemberListAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<MemberListResponse>> GetInstitutionMemberListAsync(Guid institutionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<MemberListResponse>> GetBranchMemberListAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<MemberListResponse>> GetAllMemberListAsync(CancellationToken cancellationToken = default);
    Task<MemberDetailResponse?> GetMemberDetailsByIdAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<MemberContactResponse> AddContactAsync(Guid memberId, CreateMemberContactRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> ChangePlanOrShiftAsync(Guid memberId, ChangeMemberPlanShiftRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> RenewMembershipAsync(Guid memberId, string? userId, CancellationToken cancellationToken = default);
    Task<MembershipSummaryResponse> GetMembershipSummaryAsync(CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> UploadPhotoAsync(Guid memberId, IFormFile file, string? userId, CancellationToken cancellationToken = default);
    Task<(string FilePath, string ContentType, string FileName)?> GetPhotoAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> UploadAadhaarAsync(Guid memberId, IFormFile file, string? userId, CancellationToken cancellationToken = default);
    Task<(string FilePath, string ContentType, string FileName)?> GetAadhaarAsync(Guid memberId, CancellationToken cancellationToken = default);
    //Task<MemberResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, CancellationToken cancellationToken = default);
    //Task<MemberResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, UpdateMemberRequest request, string? userId, CancellationToken cancellationToken = default);
    //Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, string? userId, CancellationToken cancellationToken = default);
    //Task TransferAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, TransferMemberRequest request, string? userId, CancellationToken cancellationToken = default);
}
