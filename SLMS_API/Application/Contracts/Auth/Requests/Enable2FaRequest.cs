namespace SLMS_API.Application.Contracts.Auth.Requests;

public class Enable2FaRequest
{
    public string? Code { get; set; }
}
