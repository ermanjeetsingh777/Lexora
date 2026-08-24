using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyModel;
using SLMS_API.Application.Contracts.Books.Responses;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers
{
    [ApiController]
    [Route("api/v1/members")]
    [Authorize]
    public class AllMembersController : Controller
    {
        private readonly IMemberService _memberService;
        private readonly IBookService _bookService;
        private readonly ICurrentUserService _currentUserService;

        public AllMembersController(IMemberService memberService, IBookService bookService, ICurrentUserService currentUserService)
        {
            _memberService = memberService;
            _bookService = bookService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        //[Permission(PermissionKey.MembersManage)]
        public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberListResponse>>>> GetAll(CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(_currentUserService.UserId, out _))
            {
                return Unauthorized();
            }

            try
            {
                var members = await _memberService.GetAllMemberListAsync(cancellationToken);

                return Ok(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Ok(members));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Fail(ex.Message));
            }
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<MembershipSummaryResponse>>> GetSummary(CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(_currentUserService.UserId, out _))
            {
                return Unauthorized();
            }

            try
            {
                var summary = await _memberService.GetMembershipSummaryAsync(cancellationToken);
                return Ok(ApiResponse<MembershipSummaryResponse>.Ok(summary));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<MembershipSummaryResponse>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MembershipSummaryResponse>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}")]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> GetById(Guid memberId, CancellationToken cancellationToken)
        {
            try
            {

                var member = await _memberService.GetMemberDetailsByIdAsync(memberId, cancellationToken);

                if (member is null)
                {
                    return NotFound(ApiResponse<MemberDetailResponse>.Fail("Member not found."));
                }

                return Ok(ApiResponse<MemberDetailResponse>.Ok(member));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpPut("{memberId:guid}")]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> Update(
            Guid memberId,
            [FromBody] UpdateMemberRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.UpdateAsync(memberId, request, _currentUserService.UserId, cancellationToken);
                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, "Member updated successfully."));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/contacts")]
        //[Permission(PermissionKey.MembersManage)]
        public async Task<ActionResult<ApiResponse<MemberContactResponse>>> AddContact( Guid memberId, [FromBody] CreateMemberContactRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var contact = await _memberService.AddContactAsync(memberId, request, _currentUserService.UserId, cancellationToken);

                return Ok(ApiResponse<MemberContactResponse>.Ok( contact, "Member contact added successfully."));
            }
            catch (InvalidOperationException ex)
            {
                //_logger.LogWarning(ex, "Add contact failed for member {MemberId}", memberId);

                return BadRequest( ApiResponse<MemberContactResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/plan-or-shift")]
        //[Permission(PermissionKey.MembersManage)]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> ChangePlanOrShift(Guid memberId, [FromBody] ChangeMemberPlanShiftRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.ChangePlanOrShiftAsync(memberId, request, _currentUserService.UserId, cancellationToken);

                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, request.PlanId.HasValue ? "Member plan changed successfully.": "Member shift changed successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/renew")]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> RenewMembership(Guid memberId, CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.RenewMembershipAsync(memberId, _currentUserService.UserId, cancellationToken);
                var expiryLabel = member.PlanEndDate?.ToString("dd MMM yyyy") ?? "—";
                var message = $"{member.Name} renewed — valid until {expiryLabel}";

                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/password")]
        public async Task<ActionResult<ApiResponse<MessageResponse>>> ChangePassword(
            Guid memberId,
            [FromBody] ChangeMemberPasswordRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                await _memberService.ChangeMemberPasswordAsync(memberId, request, _currentUserService.UserId, cancellationToken);
                return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "Member password updated successfully." }));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<MessageResponse>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}/book-loans")]
        public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberBookLoanResponse>>>> GetBookLoans(
            Guid memberId,
            CancellationToken cancellationToken)
        {
            try
            {
                var loans = await _bookService.GetMemberLoansAsync(memberId, cancellationToken);
                return Ok(ApiResponse<IReadOnlyCollection<MemberBookLoanResponse>>.Ok(loans));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<IReadOnlyCollection<MemberBookLoanResponse>>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}/digital-books")]
        public async Task<ActionResult<ApiResponse<IReadOnlyCollection<BookListItemResponse>>>> GetDigitalBooks(
            Guid memberId,
            [FromQuery] string? search,
            [FromQuery] string? category,
            CancellationToken cancellationToken)
        {
            try
            {
                var books = await _bookService.GetMemberDigitalBooksAsync(memberId, search, category, cancellationToken);
                return Ok(ApiResponse<IReadOnlyCollection<BookListItemResponse>>.Ok(books));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<IReadOnlyCollection<BookListItemResponse>>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}/digital-books/{bookId:guid}/pdf")]
        public async Task<IActionResult> DownloadDigitalBookPdf(
            Guid memberId,
            Guid bookId,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _bookService.GetMemberDigitalBookPdfAsync(memberId, bookId, cancellationToken);
                if (result is null) return NotFound();
                var (filePath, contentType, fileName) = result.Value;
                return PhysicalFile(filePath, contentType, fileName);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/photo")]
        [RequestSizeLimit(5_242_880)]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> UploadPhoto(
            Guid memberId,
            IFormFile file,
            CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.UploadPhotoAsync(memberId, file, _currentUserService.UserId, cancellationToken);
                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, "Photo uploaded successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}/photo")]
        public async Task<IActionResult> GetPhoto(Guid memberId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _memberService.GetPhotoAsync(memberId, cancellationToken);
                if (result is null) return NotFound();
                var (filePath, contentType, fileName) = result.Value;
                return PhysicalFile(filePath, contentType, fileName);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/aadhaar")]
        [RequestSizeLimit(10_485_760)]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> UploadAadhaar(
            Guid memberId,
            IFormFile file,
            CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.UploadAadhaarAsync(memberId, file, _currentUserService.UserId, cancellationToken);
                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, "Aadhaar document uploaded successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}/aadhaar")]
        public async Task<IActionResult> GetAadhaar(Guid memberId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _memberService.GetAadhaarAsync(memberId, cancellationToken);
                if (result is null) return NotFound();
                var (filePath, contentType, fileName) = result.Value;
                return PhysicalFile(filePath, contentType, fileName);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

    }
}
