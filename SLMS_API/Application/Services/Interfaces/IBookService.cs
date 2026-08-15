using Microsoft.AspNetCore.Http;
using SLMS_API.Application.Contracts.Books.Requests;
using SLMS_API.Application.Contracts.Books.Responses;
using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Services.Interfaces;

public interface IBookService
{
    Task<IReadOnlyCollection<BookListItemResponse>> GetBooksAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        string? search,
        string? category,
        BookStockStatus? status,
        CancellationToken cancellationToken = default);

    Task<BookStatsResponse> GetStatsAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse?> GetByIdAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> CreateAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CreateBookRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> UpdateAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        UpdateBookRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> AdjustStockAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        AdjustBookStockRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> MarkConditionAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        string kind,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> CheckoutAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CheckoutBookRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<BookReturnResponse> ReturnLoanAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        Guid loanId,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<MemberBookLoanResponse>> GetMemberLoansAsync(
        Guid memberId,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> UploadPdfAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        IFormFile file,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<(string FilePath, string ContentType, string FileName)?> GetPdfAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken = default);

    Task<BookDetailResponse> RemovePdfAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default);

    Task<BookReminderResponse> SendReturnReminderAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        Guid loanId,
        string? userId,
        CancellationToken cancellationToken = default);
}
