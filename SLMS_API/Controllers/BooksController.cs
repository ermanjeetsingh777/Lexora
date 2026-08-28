using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Books.Requests;
using SLMS_API.Application.Contracts.Books.Responses;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/libraries/{libraryId:guid}/books")]
[Authorize]
public class BooksController : ControllerBase
{
    private readonly IBookService _bookService;
    private readonly ICurrentUserService _currentUserService;

    public BooksController(IBookService bookService, ICurrentUserService currentUserService)
    {
        _bookService = bookService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Permission(PermissionKey.BooksList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<BookListItemResponse>>>> GetBooks(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] BookStockStatus? status,
        CancellationToken cancellationToken)
    {
        try
        {
            var items = await _bookService.GetBooksAsync(institutionId, branchId, libraryId, search, category, status, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<BookListItemResponse>>.Ok(items));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyCollection<BookListItemResponse>>.Fail(ex.Message));
        }
    }

    [HttpGet("stats")]
    [Permission(PermissionKey.BooksView)]
    public async Task<ActionResult<ApiResponse<BookStatsResponse>>> GetStats(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        try
        {
            var stats = await _bookService.GetStatsAsync(institutionId, branchId, libraryId, cancellationToken);
            return Ok(ApiResponse<BookStatsResponse>.Ok(stats));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookStatsResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("{bookId:guid}")]
    [Permission(PermissionKey.BooksView)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> GetById(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.GetByIdAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
            if (book is null) return NotFound(ApiResponse<BookDetailResponse>.Fail("Book not found."));
            return Ok(ApiResponse<BookDetailResponse>.Ok(book));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost]
    [Permission(PermissionKey.BooksCreate)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> Create(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        [FromBody] CreateBookRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.CreateAsync(
                institutionId, branchId, libraryId, request,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book, "Book created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPut("{bookId:guid}")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> Update(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        [FromBody] UpdateBookRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.UpdateAsync(
                institutionId, branchId, libraryId, bookId, request,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book, "Book updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{bookId:guid}/stock/adjust")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> AdjustStock(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        [FromBody] AdjustBookStockRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.AdjustStockAsync(
                institutionId, branchId, libraryId, bookId, request,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{bookId:guid}/stock/{kind}")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> MarkCondition(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        string kind,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.MarkConditionAsync(
                institutionId, branchId, libraryId, bookId, kind,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{bookId:guid}/checkout")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> Checkout(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        [FromBody] CheckoutBookRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.CheckoutAsync(
                institutionId, branchId, libraryId, bookId, request,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book, "Copy issued successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{bookId:guid}/loans/{loanId:guid}/return")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookReturnResponse>>> ReturnLoan(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        Guid loanId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _bookService.ReturnLoanAsync(
                institutionId, branchId, libraryId, bookId, loanId,
                _currentUserService.UserId, null, cancellationToken);
            var message = result.FineAmount is > 0
                ? $"Copy returned. Overdue fine: ₹{result.FineAmount:0.##} ({result.OverdueDays} day(s))."
                : "Copy returned successfully.";
            return Ok(ApiResponse<BookReturnResponse>.Ok(result, message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookReturnResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{bookId:guid}/loans/{loanId:guid}/reminder")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookReminderResponse>>> SendReturnReminder(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        Guid loanId,
        CancellationToken cancellationToken)
    {
        try
        {
            var reminder = await _bookService.SendReturnReminderAsync(
                institutionId, branchId, libraryId, bookId, loanId,
                _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<BookReminderResponse>.Ok(reminder, "Return reminder sent."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookReminderResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{bookId:guid}/pdf")]
    [Permission(PermissionKey.BooksUpdate)]
    [RequestSizeLimit(26_214_400)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> UploadPdf(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.UploadPdfAsync(
                institutionId, branchId, libraryId, bookId, file,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book, "PDF uploaded successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("{bookId:guid}/pdf")]
    [Permission(PermissionKey.BooksView)]
    public async Task<IActionResult> DownloadPdf(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _bookService.GetPdfAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
            if (result is null) return NotFound();
            var (filePath, contentType, fileName) = result.Value;
            return PhysicalFile(filePath, contentType, fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpDelete("{bookId:guid}/pdf")]
    [Permission(PermissionKey.BooksUpdate)]
    public async Task<ActionResult<ApiResponse<BookDetailResponse>>> RemovePdf(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken)
    {
        try
        {
            var book = await _bookService.RemovePdfAsync(
                institutionId, branchId, libraryId, bookId,
                _currentUserService.UserId, null, cancellationToken);
            return Ok(ApiResponse<BookDetailResponse>.Ok(book, "PDF removed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BookDetailResponse>.Fail(ex.Message));
        }
    }
}
