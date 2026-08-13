using SLMS_API.Application.Contracts.Support.Requests;
using SLMS_API.Application.Contracts.Support.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface ISupportService
{
    Task<IReadOnlyCollection<SupportTicketListItemResponse>> GetTicketsAsync(string userId, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailResponse> GetTicketByIdAsync(string userId, Guid ticketId, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailResponse> CreateTicketAsync(string userId, CreateSupportTicketRequest request, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailResponse> AddMessageAsync(string userId, Guid ticketId, AddTicketMessageRequest request, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailResponse> UpdateTicketStatusAsync(string userId, Guid ticketId, UpdateTicketStatusRequest request, CancellationToken cancellationToken = default);
    Task<SupportAttachmentResponse> UploadAttachmentAsync(string userId, IFormFile file, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)?> DownloadAttachmentAsync(string userId, Guid attachmentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<KnowledgeBaseArticleResponse>> SearchArticlesAsync(string? query, string? category, CancellationToken cancellationToken = default);
    Task<KnowledgeBaseArticleResponse?> GetArticleByIdAsync(Guid articleId, CancellationToken cancellationToken = default);
    Task<SystemStatusResponse> GetSystemStatusAsync(CancellationToken cancellationToken = default);
    Task<SystemIncidentResponse> SimulateIncidentAsync(string userId, CancellationToken cancellationToken = default);
}
