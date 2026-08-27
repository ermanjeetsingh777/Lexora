using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Support.Requests;
using SLMS_API.Application.Contracts.Support.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/support")]
[Authorize]
public class SupportController : ControllerBase
{
    private readonly ISupportService _supportService;
    private readonly ICurrentUserService _currentUserService;

    public SupportController(ISupportService supportService, ICurrentUserService currentUserService)
    {
        _supportService = supportService;
        _currentUserService = currentUserService;
    }

    [HttpGet("context")]
    public async Task<ActionResult<ApiResponse<SupportContextResponse>>> GetContext(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        var item = await _supportService.GetContextAsync(userId, cancellationToken);
        return Ok(ApiResponse<SupportContextResponse>.Ok(item));
    }

    [HttpGet("tickets")]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<SupportTicketListItemResponse>>>> GetTickets(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        var items = await _supportService.GetTicketsAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<SupportTicketListItemResponse>>.Ok(items));
    }

    [HttpGet("tickets/{ticketId:guid}")]
    public async Task<ActionResult<ApiResponse<SupportTicketDetailResponse>>> GetTicket(Guid ticketId, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var item = await _supportService.GetTicketByIdAsync(userId, ticketId, cancellationToken);
            return Ok(ApiResponse<SupportTicketDetailResponse>.Ok(item));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<ApiResponse<SupportTicketDetailResponse>>> CreateTicket([FromBody] CreateSupportTicketRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var item = await _supportService.CreateTicketAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<SupportTicketDetailResponse>.Ok(item, "Ticket created."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("tickets/{ticketId:guid}/messages")]
    public async Task<ActionResult<ApiResponse<SupportTicketDetailResponse>>> AddMessage(Guid ticketId, [FromBody] AddTicketMessageRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var item = await _supportService.AddMessageAsync(userId, ticketId, request, cancellationToken);
            return Ok(ApiResponse<SupportTicketDetailResponse>.Ok(item, "Reply sent."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPatch("tickets/{ticketId:guid}/status")]
    public async Task<ActionResult<ApiResponse<SupportTicketDetailResponse>>> UpdateStatus(Guid ticketId, [FromBody] UpdateTicketStatusRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var item = await _supportService.UpdateTicketStatusAsync(userId, ticketId, request, cancellationToken);
            return Ok(ApiResponse<SupportTicketDetailResponse>.Ok(item, "Ticket updated."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SupportTicketDetailResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("attachments")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<SupportAttachmentResponse>>> UploadAttachment(IFormFile file, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var item = await _supportService.UploadAttachmentAsync(userId, file, cancellationToken);
            return Ok(ApiResponse<SupportAttachmentResponse>.Ok(item, "Attachment uploaded."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SupportAttachmentResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("attachments/{attachmentId:guid}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid attachmentId, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var result = await _supportService.DownloadAttachmentAsync(userId, attachmentId, cancellationToken);
            if (result == null)
            {
                return NotFound(ApiResponse<object>.Fail("Attachment not found."));
            }

            return File(result.Value.Stream, result.Value.ContentType, result.Value.FileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpGet("articles")]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<KnowledgeBaseArticleResponse>>>> SearchArticles([FromQuery] string? q, [FromQuery] string? category, CancellationToken cancellationToken)
    {
        var items = await _supportService.SearchArticlesAsync(q, category, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<KnowledgeBaseArticleResponse>>.Ok(items));
    }

    [HttpGet("articles/{articleId:guid}")]
    public async Task<ActionResult<ApiResponse<KnowledgeBaseArticleResponse>>> GetArticle(Guid articleId, CancellationToken cancellationToken)
    {
        var item = await _supportService.GetArticleByIdAsync(articleId, cancellationToken);
        if (item == null)
        {
            return NotFound(ApiResponse<KnowledgeBaseArticleResponse>.Fail("Article not found."));
        }

        return Ok(ApiResponse<KnowledgeBaseArticleResponse>.Ok(item));
    }

    [HttpGet("status")]
    public async Task<ActionResult<ApiResponse<SystemStatusResponse>>> GetStatus(CancellationToken cancellationToken)
    {
        var item = await _supportService.GetSystemStatusAsync(cancellationToken);
        return Ok(ApiResponse<SystemStatusResponse>.Ok(item));
    }

    [HttpPost("status/simulate-incident")]
    public async Task<ActionResult<ApiResponse<SystemIncidentResponse>>> SimulateIncident(CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId ?? string.Empty;
            var item = await _supportService.SimulateIncidentAsync(userId, cancellationToken);
            return Ok(ApiResponse<SystemIncidentResponse>.Ok(item, "Incident simulated."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SystemIncidentResponse>.Fail(ex.Message));
        }
    }
}
