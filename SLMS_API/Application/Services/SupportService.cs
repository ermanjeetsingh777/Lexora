using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Support.Requests;
using SLMS_API.Application.Contracts.Support.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.Support;

namespace SLMS_API.Application.Services;

public class SupportService : ISupportService
{
    private const long MaxAttachmentBytes = 10 * 1024 * 1024;
    private static readonly string[] AllowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".txt"];

    private readonly ApplicationDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISupportAccessResolver _accessResolver;
    private readonly SupportStatusSimulator _statusSimulator;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SupportService> _logger;

    public SupportService(
        ApplicationDbContext db,
        ICurrentUserService currentUserService,
        ISupportAccessResolver accessResolver,
        SupportStatusSimulator statusSimulator,
        IWebHostEnvironment environment,
        ILogger<SupportService> logger)
    {
        _db = db;
        _currentUserService = currentUserService;
        _accessResolver = accessResolver;
        _statusSimulator = statusSimulator;
        _environment = environment;
        _logger = logger;
    }

    public Task<SupportContextResponse> GetContextAsync(string userId, CancellationToken cancellationToken = default) =>
        _accessResolver.BuildContextResponseAsync(userId, cancellationToken);

    public async Task<IReadOnlyCollection<SupportTicketListItemResponse>> GetTicketsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        var query = _db.SupportTickets.AsNoTracking().Where(t => !t.IsDeleted);
        query = ApplyTicketScope(query, access);

        return await query
            .OrderByDescending(t => t.UpdatedAtUtc ?? t.CreatedAtUtc)
            .Select(t => new SupportTicketListItemResponse
            {
                Id = t.Id,
                Subject = t.Subject,
                Category = t.Category,
                Priority = t.Priority,
                Status = t.Status,
                OwnerName = t.OwnerName,
                RequesterName = t.RequesterName,
                CreatedAtUtc = t.CreatedAtUtc,
                UpdatedAtUtc = t.UpdatedAtUtc,
                MessageCount = t.Messages.Count(m => !m.IsDeleted),
                InstitutionId = t.InstitutionId,
                InstitutionName = t.InstitutionName,
                IsOwnRequest = t.RequesterUserId == userId,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<SupportTicketDetailResponse> GetTicketByIdAsync(string userId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        var ticket = await LoadTicketQuery()
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Ticket not found.");

        if (!_accessResolver.CanViewTicket(access, ticket))
        {
            throw new UnauthorizedAccessException("You do not have access to this ticket.");
        }

        return MapTicketDetail(ticket, access, userId);
    }

    public async Task<SupportTicketDetailResponse> CreateTicketAsync(string userId, CreateSupportTicketRequest request, CancellationToken cancellationToken = default)
    {
        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        var caller = await _currentUserService.GetCurrentUserAsync(cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            throw new InvalidOperationException("Subject is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new InvalidOperationException("Description is required.");
        }

        if (!_accessResolver.GetCreatableCategories(access).Contains(request.Category))
        {
            throw new InvalidOperationException("You cannot create tickets in this category.");
        }

        var (institutionId, institutionName, memberId, requesterUserId, requesterName, requesterEmail) =
            await ResolveTicketPartiesAsync(userId, access, request, cancellationToken);

        var now = DateTime.UtcNow;
        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            Subject = request.Subject.Trim(),
            Category = request.Category,
            Priority = request.Priority,
            Status = TicketStatus.Open,
            Area = request.Area?.Trim(),
            RequesterUserId = requesterUserId,
            RequesterName = requesterName,
            RequesterEmail = requesterEmail,
            OwnerName = "Support Team",
            Channel = request.MemberId.HasValue ? "Staff portal" : "Portal",
            InstitutionId = institutionId,
            InstitutionName = institutionName,
            MemberId = memberId,
            CreatedByUserId = userId,
            SlaDueAtUtc = now.AddHours(request.Priority == TicketPriority.Urgent ? 4 : request.Priority == TicketPriority.High ? 8 : 24),
            CreatedAtUtc = now,
            CreatedBy = userId,
        };

        var authorRole = _accessResolver.ResolveAuthorRole(access);
        ticket.Messages.Add(new SupportTicketMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            AuthorUserId = userId,
            AuthorName = caller.FullName ?? caller.Email ?? "User",
            AuthorRole = authorRole,
            Body = request.Description.Trim(),
            CreatedAtUtc = now,
            CreatedBy = userId,
        });

        ticket.StatusHistory.Add(new SupportTicketStatusHistory
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            FromStatus = TicketStatus.Open,
            ToStatus = TicketStatus.Open,
            ChangedByUserId = userId,
            ChangedByName = caller.FullName ?? caller.Email ?? "User",
            ChangedByRole = authorRole,
            CreatedAtUtc = now,
            CreatedBy = userId,
        });

        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync(cancellationToken);

        if (request.AttachmentIds?.Any() == true)
        {
            var firstMessageId = ticket.Messages.First().Id;
            await LinkAttachmentsAsync(ticket.Id, firstMessageId, request.AttachmentIds, userId, cancellationToken);
        }

        return await GetTicketByIdAsync(userId, ticket.Id, cancellationToken);
    }

    public async Task<SupportTicketDetailResponse> AddMessageAsync(string userId, Guid ticketId, AddTicketMessageRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Body) && (request.AttachmentIds == null || !request.AttachmentIds.Any()))
        {
            throw new InvalidOperationException("Message body or at least one attachment is required.");
        }

        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        var ticket = await _db.SupportTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Ticket not found.");

        if (!_accessResolver.CanReply(access, ticket))
        {
            throw new UnauthorizedAccessException("You do not have access to reply on this ticket.");
        }

        var user = await _currentUserService.GetCurrentUserAsync(cancellationToken);
        var authorRole = _accessResolver.ResolveAuthorRole(access);
        var now = DateTime.UtcNow;
        var message = new SupportTicketMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            AuthorUserId = userId,
            AuthorName = user?.FullName ?? user?.Email ?? "User",
            AuthorRole = authorRole,
            Body = string.IsNullOrWhiteSpace(request.Body) ? string.Empty : request.Body.Trim(),
            CreatedAtUtc = now,
            CreatedBy = userId,
        };

        _db.SupportTicketMessages.Add(message);

        ticket.UpdatedAtUtc = now;
        ticket.UpdatedBy = userId;

        if (ticket.Status == TicketStatus.Resolved && !_accessResolver.CanChangeStatus(access, ticket))
        {
            var previousStatus = ticket.Status;
            ticket.Status = TicketStatus.Open;
            _db.SupportTicketStatusHistories.Add(new SupportTicketStatusHistory
            {
                Id = Guid.NewGuid(),
                TicketId = ticket.Id,
                FromStatus = previousStatus,
                ToStatus = TicketStatus.Open,
                ChangedByUserId = userId,
                ChangedByName = user?.FullName ?? user?.Email ?? "User",
                ChangedByRole = authorRole,
                CreatedAtUtc = now,
                CreatedBy = userId,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        if (request.AttachmentIds?.Any() == true)
        {
            await LinkAttachmentsAsync(ticket.Id, message.Id, request.AttachmentIds, userId, cancellationToken);
        }

        return await GetTicketByIdAsync(userId, ticketId, cancellationToken);
    }

    public async Task<SupportTicketDetailResponse> UpdateTicketStatusAsync(string userId, Guid ticketId, UpdateTicketStatusRequest request, CancellationToken cancellationToken = default)
    {
        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        var ticket = await _db.SupportTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Ticket not found.");

        if (!_accessResolver.CanViewTicket(access, ticket))
        {
            throw new UnauthorizedAccessException("You do not have access to this ticket.");
        }

        if (!_accessResolver.CanChangeStatus(access, ticket))
        {
            throw new UnauthorizedAccessException("You are not allowed to change the status of this ticket.");
        }

        if (ticket.Status == request.Status)
        {
            return await GetTicketByIdAsync(userId, ticketId, cancellationToken);
        }

        var user = await _currentUserService.GetCurrentUserAsync(cancellationToken);
        var authorRole = _accessResolver.ResolveAuthorRole(access);
        var now = DateTime.UtcNow;
        var previousStatus = ticket.Status;

        ticket.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.OwnerName))
        {
            ticket.OwnerName = request.OwnerName.Trim();
        }

        ticket.UpdatedAtUtc = now;
        ticket.UpdatedBy = userId;

        _db.SupportTicketStatusHistories.Add(new SupportTicketStatusHistory
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            FromStatus = previousStatus,
            ToStatus = request.Status,
            ChangedByUserId = userId,
            ChangedByName = user?.FullName ?? user?.Email ?? "User",
            ChangedByRole = authorRole,
            CreatedAtUtc = now,
            CreatedBy = userId,
        });

        await _db.SaveChangesAsync(cancellationToken);

        return await GetTicketByIdAsync(userId, ticketId, cancellationToken);
    }

    public async Task<SupportAttachmentResponse> UploadAttachmentAsync(string userId, IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("File is empty.");
        }

        if (file.Length > MaxAttachmentBytes)
        {
            throw new InvalidOperationException("File exceeds the 10 MB limit.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("File type is not allowed.");
        }

        var uploadRoot = Path.Combine(_environment.ContentRootPath, "uploads", "support");
        Directory.CreateDirectory(uploadRoot);

        var storedName = $"{Guid.NewGuid():N}{extension}";
        var storagePath = Path.Combine(uploadRoot, storedName);

        await using (var stream = File.Create(storagePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var attachment = new SupportTicketAttachment
        {
            Id = Guid.NewGuid(),
            FileName = Path.GetFileName(file.FileName),
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = file.Length,
            StoragePath = storagePath,
            UploadedByUserId = userId,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = userId,
        };

        _db.SupportTicketAttachments.Add(attachment);
        await _db.SaveChangesAsync(cancellationToken);

        return MapAttachment(attachment);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> DownloadAttachmentAsync(string userId, Guid attachmentId, CancellationToken cancellationToken = default)
    {
        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        var attachment = await _db.SupportTicketAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == attachmentId && !a.IsDeleted, cancellationToken);

        if (attachment == null)
        {
            return null;
        }

        if (attachment.TicketId.HasValue)
        {
            var ticket = await _db.SupportTickets
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == attachment.TicketId && !t.IsDeleted, cancellationToken);

            if (ticket == null || !_accessResolver.CanViewTicket(access, ticket))
            {
                throw new InvalidOperationException("You do not have access to this attachment.");
            }
        }
        else if (!string.Equals(attachment.UploadedByUserId, userId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("You do not have access to this attachment.");
        }

        if (!File.Exists(attachment.StoragePath))
        {
            throw new InvalidOperationException("Attachment file is missing.");
        }

        var stream = File.OpenRead(attachment.StoragePath);
        return (stream, attachment.ContentType, attachment.FileName);
    }

    public async Task<IReadOnlyCollection<KnowledgeBaseArticleResponse>> SearchArticlesAsync(string? query, string? category, CancellationToken cancellationToken = default)
    {
        var articles = _db.KnowledgeBaseArticles.AsNoTracking().Where(a => !a.IsDeleted);

        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
        {
            articles = articles.Where(a => a.Category == category);
        }

        var list = await articles.OrderByDescending(a => a.ViewCount).ToListAsync(cancellationToken);
        var normalizedQuery = query?.Trim().ToLowerInvariant();

        IEnumerable<KnowledgeBaseArticle> filtered = list;
        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            filtered = list.Where(a =>
                a.Title.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase) ||
                a.Body.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase) ||
                a.Tags.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase));
        }

        return filtered.Select(MapArticle).ToList();
    }

    public async Task<KnowledgeBaseArticleResponse?> GetArticleByIdAsync(Guid articleId, CancellationToken cancellationToken = default)
    {
        var article = await _db.KnowledgeBaseArticles.FirstOrDefaultAsync(a => a.Id == articleId && !a.IsDeleted, cancellationToken);
        if (article == null)
        {
            return null;
        }

        article.ViewCount += 1;
        article.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return MapArticle(article);
    }

    public async Task<SystemStatusResponse> GetSystemStatusAsync(CancellationToken cancellationToken = default)
    {
        var incidents = await _db.SystemIncidents
            .AsNoTracking()
            .Include(i => i.Updates.Where(u => !u.IsDeleted))
            .Where(i => !i.IsDeleted)
            .OrderByDescending(i => i.StartedAtUtc)
            .ToListAsync(cancellationToken);

        var active = incidents
            .Where(i => i.ResolvedAtUtc == null)
            .Select(MapIncident)
            .ToList();

        var history = incidents
            .Where(i => i.ResolvedAtUtc != null)
            .Take(20)
            .Select(MapIncident)
            .ToList();

        return _statusSimulator.BuildStatus(active, history);
    }

    public async Task<SystemIncidentResponse> SimulateIncidentAsync(string userId, CancellationToken cancellationToken = default)
    {
        var access = await _accessResolver.ResolveAsync(userId, cancellationToken);
        if (!access.IsSuperAdmin)
        {
            throw new UnauthorizedAccessException("Only SuperAdmin can simulate incidents.");
        }

        var components = new[] { "API Gateway", "Member Portal", "Attendance", "Notifications" };
        var affected = components.OrderBy(_ => Guid.NewGuid()).Take(2).ToArray();
        var now = DateTime.UtcNow;

        var incident = new SystemIncident
        {
            Id = Guid.NewGuid(),
            Title = "Elevated error rates detected",
            Severity = "major",
            Status = "Investigating",
            AffectedComponents = JsonSerializer.Serialize(affected),
            StartedAtUtc = now,
            CreatedAtUtc = now,
            CreatedBy = userId,
            Updates =
            [
                new SystemIncidentUpdate
                {
                    Id = Guid.NewGuid(),
                    Phase = "Investigating",
                    Body = "We are investigating increased latency and error rates on affected services.",
                    OccurredAtUtc = now,
                    CreatedAtUtc = now,
                    CreatedBy = userId,
                }
            ],
        };

        _db.SystemIncidents.Add(incident);
        await _db.SaveChangesAsync(cancellationToken);
        _statusSimulator.ApplyIncident(affected);

        return MapIncident(incident);
    }

    private static IQueryable<SupportTicket> ApplyTicketScope(IQueryable<SupportTicket> query, SupportAccessContext access)
    {
        if (access.IsSuperAdmin)
        {
            return query;
        }

        return query.Where(t =>
            t.RequesterUserId == access.UserId
            || t.CreatedByUserId == access.UserId
            || (t.InstitutionId.HasValue && access.InstitutionIds.Contains(t.InstitutionId.Value)));
    }

    private async Task<(Guid? institutionId, string? institutionName, Guid? memberId, string requesterUserId, string requesterName, string requesterEmail)> ResolveTicketPartiesAsync(
        string callerUserId,
        SupportAccessContext access,
        CreateSupportTicketRequest request,
        CancellationToken cancellationToken)
    {
        if (request.MemberId.HasValue)
        {
            if (!_accessResolver.CanCreateOnBehalf(access))
            {
                throw new UnauthorizedAccessException("You cannot create tickets on behalf of members.");
            }

            var member = await _db.Members.AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.MemberLibraries)
                .FirstOrDefaultAsync(m => m.Id == request.MemberId.Value && !m.IsDeleted, cancellationToken)
                ?? throw new InvalidOperationException("Member not found.");

            var memberInstitutionId = member.MemberLibraries.FirstOrDefault()?.InstitutionId;
            if (!memberInstitutionId.HasValue)
            {
                throw new InvalidOperationException("Member is not linked to an institution.");
            }

            if (!access.IsSuperAdmin && !access.InstitutionIds.Contains(memberInstitutionId.Value))
            {
                throw new UnauthorizedAccessException("You do not have access to this member's institution.");
            }

            if (request.InstitutionId.HasValue && request.InstitutionId.Value != memberInstitutionId.Value)
            {
                throw new InvalidOperationException("Selected institution does not match the member.");
            }

            var institution = await _db.Institutions.AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == memberInstitutionId.Value && !i.IsDeleted, cancellationToken)
                ?? throw new InvalidOperationException("Institution not found.");

            return (
                institution.Id,
                institution.Name,
                member.Id,
                member.UserId,
                member.FullName,
                member.User.Email ?? string.Empty);
        }

        var institutionId = request.InstitutionId;
        if (institutionId.HasValue && !access.IsSuperAdmin && !access.InstitutionIds.Contains(institutionId.Value))
        {
            throw new UnauthorizedAccessException("You do not have access to the selected institution.");
        }

        if (!institutionId.HasValue)
        {
            institutionId = access.InstitutionIds.FirstOrDefault();
        }

        string? institutionName = null;
        if (institutionId.HasValue)
        {
            institutionName = await _db.Institutions.AsNoTracking()
                .Where(i => i.Id == institutionId.Value && !i.IsDeleted)
                .Select(i => i.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var caller = await _currentUserService.GetCurrentUserAsync(cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        return (
            institutionId,
            institutionName,
            null,
            callerUserId,
            caller.FullName ?? caller.Email ?? "User",
            caller.Email ?? string.Empty);
    }

    private IQueryable<SupportTicket> LoadTicketQuery() =>
        _db.SupportTickets
            .AsNoTracking()
            .Include(t => t.Messages.Where(m => !m.IsDeleted))
                .ThenInclude(m => m.Attachments.Where(a => !a.IsDeleted))
            .Include(t => t.Attachments.Where(a => !a.IsDeleted && a.MessageId == null))
            .Include(t => t.StatusHistory.Where(h => !h.IsDeleted));

    private async Task LinkAttachmentsAsync(Guid ticketId, Guid? messageId, IEnumerable<Guid> attachmentIds, string userId, CancellationToken cancellationToken)
    {
        var ids = attachmentIds.Distinct().ToList();
        var attachments = await _db.SupportTicketAttachments
            .Where(a => ids.Contains(a.Id) && !a.IsDeleted && a.UploadedByUserId == userId && a.TicketId == null && a.MessageId == null)
            .ToListAsync(cancellationToken);

        foreach (var attachment in attachments)
        {
            attachment.TicketId = ticketId;
            attachment.MessageId = messageId;
            attachment.UpdatedAtUtc = DateTime.UtcNow;
            attachment.UpdatedBy = userId;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private SupportTicketDetailResponse MapTicketDetail(SupportTicket ticket, SupportAccessContext access, string userId) =>
        new()
        {
            Id = ticket.Id,
            Subject = ticket.Subject,
            Category = ticket.Category,
            Priority = ticket.Priority,
            Status = ticket.Status,
            Area = ticket.Area,
            RequesterName = ticket.RequesterName,
            RequesterEmail = ticket.RequesterEmail,
            OwnerName = ticket.OwnerName,
            Channel = ticket.Channel,
            CreatedAtUtc = ticket.CreatedAtUtc,
            UpdatedAtUtc = ticket.UpdatedAtUtc,
            SlaDueAtUtc = ticket.SlaDueAtUtc,
            InstitutionId = ticket.InstitutionId,
            InstitutionName = ticket.InstitutionName,
            MemberId = ticket.MemberId,
            Messages = ticket.Messages
                .Where(m => !m.IsDeleted)
                .OrderBy(m => m.CreatedAtUtc)
                .Select(m => new SupportTicketMessageResponse
                {
                    Id = m.Id,
                    AuthorName = m.AuthorName,
                    AuthorRole = m.AuthorRole,
                    Body = m.Body,
                    CreatedAtUtc = m.CreatedAtUtc,
                    Attachments = m.Attachments.Where(a => !a.IsDeleted).Select(MapAttachment).ToList(),
                })
                .ToList(),
            Attachments = ticket.Attachments.Where(a => !a.IsDeleted).Select(MapAttachment).ToList(),
            StatusHistory = ticket.StatusHistory
                .Where(h => !h.IsDeleted)
                .OrderBy(h => h.CreatedAtUtc)
                .Select(h => new SupportTicketStatusHistoryResponse
                {
                    Id = h.Id,
                    FromStatus = h.FromStatus,
                    ToStatus = h.ToStatus,
                    ChangedByName = h.ChangedByName,
                    ChangedByRole = h.ChangedByRole,
                    CreatedAtUtc = h.CreatedAtUtc,
                })
                .ToList(),
            Capabilities = new SupportTicketCapabilitiesResponse
            {
                CanReply = _accessResolver.CanReply(access, ticket),
                CanChangeStatus = _accessResolver.CanChangeStatus(access, ticket),
                CanCreateOnBehalf = _accessResolver.CanCreateOnBehalf(access),
            },
        };

    private SupportAttachmentResponse MapAttachment(SupportTicketAttachment attachment) =>
        new()
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            ContentType = attachment.ContentType,
            SizeBytes = attachment.SizeBytes,
            DownloadUrl = $"/api/v1/support/attachments/{attachment.Id}/download",
        };

    private static KnowledgeBaseArticleResponse MapArticle(KnowledgeBaseArticle article) =>
        new()
        {
            Id = article.Id,
            Title = article.Title,
            Category = article.Category,
            Tags = article.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            Body = article.Body,
            ViewCount = article.ViewCount,
            UpdatedAtUtc = article.UpdatedAtUtc ?? article.CreatedAtUtc,
        };

    private static SystemIncidentResponse MapIncident(SystemIncident incident)
    {
        string[] components;
        try
        {
            components = JsonSerializer.Deserialize<string[]>(incident.AffectedComponents) ?? Array.Empty<string>();
        }
        catch
        {
            components = Array.Empty<string>();
        }

        return new SystemIncidentResponse
        {
            Id = incident.Id,
            Title = incident.Title,
            Severity = incident.Severity,
            Status = incident.Status,
            Components = components,
            StartedAtUtc = incident.StartedAtUtc,
            ResolvedAtUtc = incident.ResolvedAtUtc,
            Updates = incident.Updates
                .Where(u => !u.IsDeleted)
                .OrderBy(u => u.OccurredAtUtc)
                .Select(u => new SystemIncidentUpdateResponse
                {
                    Id = u.Id,
                    Phase = u.Phase,
                    Body = u.Body,
                    OccurredAtUtc = u.OccurredAtUtc,
                })
                .ToList(),
        };
    }
}
