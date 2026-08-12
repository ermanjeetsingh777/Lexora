namespace SLMS_API.Application.Contracts.Organizations.Requests
{
    public class KeyValueResponse
    {
        public Guid Value { get; set; }
        public string Key { get; set; } = string.Empty;
    }
    public class InstitutionDropdownResponse : KeyValueResponse
    {
        public List<BranchDropdownResponse> Branches { get; set; } = [];
    }

    public class BranchDropdownResponse : KeyValueResponse
    {
        public List<LibraryDropdownResponse> Libraries { get; set; } = [];
    }

    public class LibraryDropdownResponse : KeyValueResponse
    {
        public List<PlanDropdownResponse> Plans { get; set; } = [];
    }
    public class PlanDropdownResponse : KeyValueResponse
    {
    }


}
