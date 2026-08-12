namespace SLMS_API.Application.Contracts.Auth.Requests;

public class Disable2FaRequest
{
    public string Code { get; set; } = string.Empty;
}
