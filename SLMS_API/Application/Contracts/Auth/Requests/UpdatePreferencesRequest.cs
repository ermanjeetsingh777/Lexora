namespace SLMS_API.Application.Contracts.Auth.Requests;

public class UpdatePreferencesRequest
{
    public string? Theme { get; set; }
    public string? Language { get; set; }
}
