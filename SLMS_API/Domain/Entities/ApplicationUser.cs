using AutoMapper.Execution;
using Microsoft.AspNetCore.Identity;
using SLMS_API.Common.Enums;

namespace SLMS_API.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
    public bool IsActive { get; set; } = true;

    public UserType UserType { get; set; } = UserType.Member;
    // Current onboarding step
    public OnboardingStep OnboardingStep { get; set; } = OnboardingStep.Registered;

    // SuperAdmin Tenant Approval Workflow
    public string ApprovalStatus { get; set; } = "Pending"; // "Pending", "Approved", "Rejected"
    public string? AdminRemarks { get; set; }
    public decimal? FinalApprovedAmount { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? RejectedAtUtc { get; set; }
    public string? ApprovedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public Member? Member { get; set; }
    public ICollection<UserPackage> UserPackages { get; set; } = new List<UserPackage>();
    public ICollection<Institution> Institutions { get; set; } = new List<Institution>();
    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
    public ICollection<Library> Libraries { get; set; } = new List<Library>();
    public ICollection<UserInstitution> UserInstitutions { get; set; } = new List<UserInstitution>();
    public ICollection<UserBranch> UserBranches { get; set; } = new List<UserBranch>();
    public ICollection<UserLibrary> UserLibraries { get; set; } = new List<UserLibrary>();
}
