namespace SLMS_API.Application.Options;

public class AppOptions
{
    public const string SectionName = "App";

    public string FrontendBaseUrl { get; set; } = "http://localhost:4200";
}
