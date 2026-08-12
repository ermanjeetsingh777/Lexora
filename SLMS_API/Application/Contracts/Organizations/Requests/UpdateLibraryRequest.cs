namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class UpdateLibraryRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? Floor { get; set; }
    public int? Capacity { get; set; }
    public bool? IsActive { get; set; }
}
