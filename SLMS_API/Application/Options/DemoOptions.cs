namespace SLMS_API.Application.Options;

public class DemoOptions
{
    public const string SectionName = "Demo";

    public bool Enabled { get; set; }

    public string AdminEmail { get; set; } = "institution@slms.com";

    public string AdminPassword { get; set; } = "Demo@12345";

    public string InstitutionName { get; set; } = "Lexora Demo Institute";
}
