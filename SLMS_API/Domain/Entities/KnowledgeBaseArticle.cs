using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class KnowledgeBaseArticle : AuditableEntity
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int ViewCount { get; set; }
}
