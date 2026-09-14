using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Common;
using Microsoft.AspNetCore.Http;

namespace SLMS_API.Application.Services.Interfaces;

public interface IMemberService
{
    //Task<IReadOnlyCollection<MemberResponse>> GetByLibraryAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default);
    Task<MemberResponse> CreateAsync(Guid institutionId, Guid branchId, Guid libraryId, CreateMemberRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<byte[]> GetBulkUploadTemplateAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default);
    Task<BulkMemberUploadResponse> BulkCreateAsync(Guid institutionId, Guid branchId, Guid libraryId, IFormFile file, string? userId, CancellationToken cancellationToken = default);
    Task<PagedResult<MemberListResponse>> GetLibraryMemberListAsync(Guid institutionId, Guid branchId, Guid libraryId, MemberListQuery query, CancellationToken cancellationToken = default);
    Task<PagedResult<MemberListResponse>> GetInstitutionMemberListAsync(Guid institutionId, MemberListQuery query, CancellationToken cancellationToken = default);
    Task<PagedResult<MemberListResponse>> GetBranchMemberListAsync(Guid institutionId, Guid branchId, MemberListQuery query, CancellationToken cancellationToken = default);
    Task<PagedResult<MemberListResponse>> GetAllMemberListAsync(MemberListQuery query, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse?> GetMemberDetailsByIdAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<Guid?> GetCurrentMemberIdAsync(CancellationToken cancellationToken = default);
    Task<MemberContactResponse> AddContactAsync(Guid memberId, CreateMemberContactRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> ChangePlanOrShiftAsync(Guid memberId, ChangeMemberPlanShiftRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> RenewMembershipAsync(Guid memberId, ChangeMemberPlanShiftRequest? request, string? userId, CancellationToken cancellationToken = default);
    Task<MembershipSummaryResponse> GetMembershipSummaryAsync(CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> UploadPhotoAsync(Guid memberId, IFormFile file, string? userId, CancellationToken cancellationToken = default);
    Task<(string FilePath, string ContentType, string FileName)?> GetPhotoAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> UploadAadhaarAsync(Guid memberId, IFormFile file, string? userId, CancellationToken cancellationToken = default);
    Task<(string FilePath, string ContentType, string FileName)?> GetAadhaarAsync(Guid memberId, CancellationToken cancellationToken = default);
    Task<MemberDetailResponse> UpdateAsync(Guid memberId, UpdateMemberRequest request, string? userId, CancellationToken cancellationToken = default);
    Task ChangeMemberPasswordAsync(Guid memberId, ChangeMemberPasswordRequest request, string? userId, CancellationToken cancellationToken = default);
    //Task<MemberResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, CancellationToken cancellationToken = default);
    //Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, string? userId, CancellationToken cancellationToken = default);
    //Task TransferAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, TransferMemberRequest request, string? userId, CancellationToken cancellationToken = default);
}
