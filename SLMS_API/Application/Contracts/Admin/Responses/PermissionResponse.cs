using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Admin.Responses;

public class PermissionResponse
{
    public PermissionKey Key { get; set; }
    public string Value { get; set; } = string.Empty;
}

