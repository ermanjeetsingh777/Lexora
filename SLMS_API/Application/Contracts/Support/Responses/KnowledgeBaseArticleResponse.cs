namespace SLMS_API.Application.Contracts.Support.Responses;

public class KnowledgeBaseArticleResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Tags { get; set; } = Array.Empty<string>();
    public string Body { get; set; } = string.Empty;
    public int ViewCount { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
