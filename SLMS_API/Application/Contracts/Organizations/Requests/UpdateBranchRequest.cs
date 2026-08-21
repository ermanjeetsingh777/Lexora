namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class UpdateBranchRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public TimeOnly? OperatingHoursStart { get; set; }
    public TimeOnly? OperatingHoursEnd { get; set; }
    public int? Capacity { get; set; }
    public bool? IsActive { get; set; }
}
