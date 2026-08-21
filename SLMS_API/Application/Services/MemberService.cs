
using AutoMapper.Execution;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyModel;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;
using System.Net;
using System.Numerics;
using SLMS_API.Application.Contracts.Organizations.Responses;
namespace SLMS_API.Application.Services;

public class MemberService : IMemberService
{
    private const long MaxPhotoBytes = 5 * 1024 * 1024;
    private const long MaxAadhaarBytes = 10 * 1024 * 1024;

    private readonly ApplicationDbContext _dbContext;
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IAuditLogService _auditLogService;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public MemberService(ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IAuthService authService,
        IConfiguration configuration,
         IAuditLogService auditLogService,
        ICurrentUserService currentUserService,
        IWebHostEnvironment environment)
    {
        _dbContext = dbContext;
        _authService = authService;
        _currentUserService = currentUserService;
        _userManager = userManager;
        _configuration = configuration;
        _auditLogService = auditLogService;
        _environment = environment;
    }

    public async Task<MemberResponse> CreateAsync(Guid institutionId, Guid branchId, Guid libraryId, CreateMemberRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        // Validate duplicate email
        if (await _userManager.FindByEmailAsync(request.Email) is not null)
            throw new InvalidOperationException($"A user with email '{request.Email}' already exists.");

        // Validate Plan
        var plan = await _dbContext.Plans.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.PlanId && x.IsActive, cancellationToken);

        if (plan is null)
        {
            throw new InvalidOperationException("Selected membership plan does not exist.");
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var now = DateTime.UtcNow;
            // 1. Create Identity User

            var applicationUser = new ApplicationUser
            {
                FullName = request.FullName,
                UserName = request.Email,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                EmailConfirmed = true,
                OnboardingStep = OnboardingStep.Completed,
                UserType = UserType.Member,
                IsActive = true,
                CreatedAtUtc = now
            };

            var defaultPassword = _configuration["Identity:DefaultMemberPassword"];

            if (string.IsNullOrWhiteSpace(defaultPassword))
            {
                throw new InvalidOperationException("Default member password is not configured.");
            }

            var identityResult = await _userManager.CreateAsync(applicationUser, defaultPassword);

            if (!identityResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join(Environment.NewLine, identityResult.Errors.Select(x => x.Description)));
            }

            // 2. Create Member
            var member = new Domain.Entities.Member
            {
                Id = Guid.NewGuid(),
                UserId = applicationUser.Id,
                FullName = request.FullName,
                PhoneNumber = request.PhoneNumber,
                MembershipNo = await GenerateMembershipNumber(cancellationToken),
                DateOfBirth = DateOnly.FromDateTime(request.DateOfBirth),
                Gender = request.Gender,
                Shift = request.Shift,
                AttendanceQrToken = Guid.NewGuid().ToString("N"),
                CreatedBy = _currentUserService.UserId
            };

            await _dbContext.Members.AddAsync(member, cancellationToken);

            // 3. Assign Plan
            var startDate = DateOnly.FromDateTime(now);
            var endDate = startDate.AddDays(plan.DurationInDays);
            await _dbContext.MemberPlans.AddAsync(new MemberPlan
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                PlanId = request.PlanId,
                StartDate = startDate,
                EndDate = endDate,
                Amount = plan.Price,
                PaidAmount = plan.Price,
                AdjustmentAmount = 0,
                IsActive = true,
                IsCurrent = true,
                CreatedBy = _currentUserService.UserId
            }, cancellationToken);

            // 4. Assign Library
            await _dbContext.MemberLibraries.AddAsync(new MemberLibrary
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                InstitutionId = institutionId,
                BranchId = branchId,
                LibraryId = libraryId,
                IsCurrent = true,
                IsActive = true,
                JoinedOn = now,
                CreatedBy = _currentUserService.UserId
            }, cancellationToken);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await _authService.EnsureRoleExistsAsync(RoleDefinitions.Members, cancellationToken);
            await _userManager.AddToRoleAsync(applicationUser, RoleDefinitions.Members);

            await _auditLogService.WriteAsync(AuditEventTypes.Register, applicationUser.Id, $"User registered: {applicationUser.Email}", "", cancellationToken);


            await transaction.CommitAsync(cancellationToken);

            return ToCreateResponse(member);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<MemberContactResponse> AddContactAsync(Guid memberId, CreateMemberContactRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        var memberExists = await _dbContext.Members
            .AnyAsync(x => x.Id == memberId, cancellationToken);

        if (!memberExists)
            throw new InvalidOperationException("Member not found.");

        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new InvalidOperationException("Contact name is required.");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new InvalidOperationException("Phone number is required.");

        if (!request.IsGuardian && !request.IsEmergencyContact)
        {
            throw new InvalidOperationException(
                "Contact must be a guardian or an emergency contact.");
        }

        var phoneNumber = request.PhoneNumber.Trim();

        var duplicateContact = await _dbContext.MemberGuardianContacts
            .AnyAsync(x => x.MemberId == memberId && x.PhoneNumber == phoneNumber && x.IsActive, cancellationToken);

        if (duplicateContact)
        {
            throw new InvalidOperationException(
                "A contact with this phone number already exists for this member.");
        }

        // Only one primary contact
        if (request.IsPrimary)
        {
            var currentPrimaryContacts = await _dbContext.MemberGuardianContacts
                .Where(x =>
                    x.MemberId == memberId &&
                    x.IsPrimary &&
                    x.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var contact in currentPrimaryContacts)
            {
                contact.IsPrimary = false;
                contact.UpdatedAtUtc = DateTime.UtcNow;
                contact.UpdatedBy = userId;
            }
        }

        var memberContact = new MemberGuardianContact
        {
            Id = Guid.NewGuid(),
            MemberId = memberId,
            FullName = request.FullName.Trim(),
            PhoneNumber = phoneNumber,
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Relation = request.Relation,
            IsGuardian = request.IsGuardian,
            IsEmergencyContact = request.IsEmergencyContact,
            IsPrimary = request.IsPrimary,
            IsActive = true,
            CreatedBy = userId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.MemberGuardianContacts.Add(memberContact);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new MemberContactResponse
        {
            Id = memberContact.Id,
            MemberId = memberContact.MemberId,
            FullName = memberContact.FullName,
            PhoneNumber = memberContact.PhoneNumber,
            Email = memberContact.Email,
            Relation = memberContact.Relation,
            IsGuardian = memberContact.IsGuardian,
            IsEmergencyContact = memberContact.IsEmergencyContact,
            IsPrimary = memberContact.IsPrimary,
            IsActive = memberContact.IsActive
        };
    }

    public async Task<MemberDetailResponse> ChangePlanOrShiftAsync(Guid memberId, ChangeMemberPlanShiftRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        var hasPlan = request.PlanId.HasValue;
        var hasShift = !string.IsNullOrWhiteSpace(request.Shift);

        // At least one required
        if (!hasPlan && !hasShift)
        {
            throw new InvalidOperationException("Please provide PlanId or Shift.");
        }

        var member = await _dbContext.Members
            .Include(x => x.MemberLibraries)
            .Include(x => x.MemberPlans)
                .ThenInclude(mp => mp.Plan)
            .FirstOrDefaultAsync(
                x => x.Id == memberId,
                cancellationToken);

        if (member is null)
            throw new InvalidOperationException("Member not found.");

        var now = DateTime.UtcNow;

        // -------------------------
        // SHIFT CHANGE
        // -------------------------
        if (hasShift)
        {
            var allowedShifts = new[] { "Morning", "Afternoon", "Evening", "Night", "General", "Full" };

            var newShift = allowedShifts.FirstOrDefault(x =>
                x.Equals(
                    request.Shift!.Trim(),
                    StringComparison.OrdinalIgnoreCase));

            if (newShift is null)
                throw new InvalidOperationException("Invalid shift.");

            // Update only if actually changed
            if (!string.Equals(
                member.Shift,
                newShift,
                StringComparison.OrdinalIgnoreCase))
            {
                member.Shift = newShift;
            }
        }

        // -------------------------
        // PLAN CHANGE
        // -------------------------
        if (hasPlan)
        {
            var currentLibrary = member.MemberLibraries
                .FirstOrDefault(x => x.IsCurrent);

            if (currentLibrary is null)
            {
                throw new InvalidOperationException("Member is not assigned to any library.");
            }

            var newPlan = await _dbContext.Plans
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == request.PlanId!.Value &&
                    x.LibraryId == currentLibrary.LibraryId &&
                    x.IsActive,
                    cancellationToken);

            if (newPlan is null)
            {
                throw new InvalidOperationException("Selected plan is not available for this library.");
            }

            decimal adjustmentAmount = 0;

            var currentPlan = member.MemberPlans
                .FirstOrDefault(x =>
                    x.IsCurrent &&
                    x.IsActive);

            // Plan actually changed
            //if (currentPlan?.PlanId != newPlan.Id)
            //{
                // Close old plan
                if (currentPlan is not null)
                {
                    currentPlan.IsCurrent = false;
                    currentPlan.IsActive = false;
                    currentPlan.IsDeleted = false;
                    currentPlan.UpdatedAtUtc = now;
                    currentPlan.UpdatedBy = userId;
                    adjustmentAmount = CalculateAdjustmentAmount(currentPlan.Plan.Price, currentPlan.Plan.DurationInDays, currentPlan.EndDate);
                }

                var amountToPay = newPlan.Price - adjustmentAmount;

                if (amountToPay < 0) amountToPay = 0;
                // Create new plan history
                var memberPlan = new MemberPlan
                {
                    Id = Guid.NewGuid(),
                    MemberId = member.Id,
                    PlanId = newPlan.Id,

                    StartDate = DateOnly.FromDateTime(now),

                    EndDate = DateOnly.FromDateTime(now.AddDays(newPlan.DurationInDays)),
                    AdjustmentAmount = adjustmentAmount,
                    Amount = newPlan.Price,
                    PaidAmount = newPlan.Price - adjustmentAmount,

                    IsCurrent = true,
                    IsActive = true,

                    CreatedAtUtc = now,
                    CreatedBy = userId
                };

                await _dbContext.MemberPlans.AddAsync(memberPlan, cancellationToken);
            //}
        }

        member.UpdatedAtUtc = now;
        member.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetMemberDetailsByIdAsync(memberId, cancellationToken) ?? throw new InvalidOperationException("Unable to retrieve member details.");

    }

    public async Task<MemberDetailResponse> RenewMembershipAsync(Guid memberId, string? userId, CancellationToken cancellationToken = default)
    {
        var member = await _dbContext.Members
            .AsNoTracking()
            .Where(x => x.Id == memberId)
            .Select(x => new
            {
                CurrentPlanId = x.MemberPlans
                    .Where(mp => mp.IsCurrent && mp.IsActive)
                    .Select(mp => (Guid?)mp.PlanId)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (member is null)
            throw new InvalidOperationException("Member not found.");

        if (!member.CurrentPlanId.HasValue)
            throw new InvalidOperationException("Member has no active plan to renew.");

        return await ChangePlanOrShiftAsync(
            memberId,
            new ChangeMemberPlanShiftRequest { PlanId = member.CurrentPlanId },
            userId,
            cancellationToken);
    }

    public async Task<MembershipSummaryResponse> GetMembershipSummaryAsync(CancellationToken cancellationToken = default)
    {
        var members = await GetAllMemberListAsync(cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var active = members.Count(x => x.Status == "Active");
        var expired = members.Count(x =>
            x.PlanEndDate.HasValue && x.PlanEndDate.Value < today &&
            (today.DayNumber - x.PlanEndDate.Value.DayNumber) > 7);
        var expiringSoon = members.Count(x =>
            x.PlanEndDate.HasValue &&
            x.PlanEndDate.Value.DayNumber - today.DayNumber is > 0 and <= 7);

        return new MembershipSummaryResponse
        {
            TotalMembers = members.Count,
            ActiveCount = active,
            ExpiredCount = expired,
            ExpiringSoonCount = expiringSoon
        };
    }

    public async Task<IReadOnlyCollection<MemberListResponse>> GetLibraryMemberListAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default)
    {
        var libraryExists = await _dbContext.Libraries
            .AsNoTracking()
            .AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

        if (!libraryExists)
            throw new InvalidOperationException("Library not found.");

        var today = DateTime.UtcNow;
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var members = await _dbContext.Members
        .AsNoTracking()
        .Where(m => m.MemberLibraries.Any(ml =>
            ml.InstitutionId == institutionId &&
            ml.BranchId == branchId &&
            ml.LibraryId == libraryId))
        .Select(m => new
        {
            m.Id,
            m.IsActive,
            m.MembershipNo,
            m.Shift,
            m.PhotoStoragePath,

            fullName = m.User.FullName,
            UserName = m.User.UserName,
            Email = m.User.Email,
            Phone = m.User.PhoneNumber,

            LibraryMapping = m.MemberLibraries
                .Where(ml =>
                    ml.InstitutionId == institutionId &&
                    ml.BranchId == branchId &&
                    ml.LibraryId == libraryId &&
                    ml.IsCurrent)
                .Select(ml => new
                {
                    InstitutionName = ml.Institution.Name,
                    BranchName = ml.Branch.Name,
                    LibraryName = ml.Library.Name,

                    ml.JoinedOn,

                    SeatNumber = ml.Seat != null
                        ? ml.Seat.SeatNumber
                        : null
                })
                .FirstOrDefault(),

            CurrentPlan = m.MemberPlans
                .Where(mp =>
                    mp.IsCurrent &&
                    mp.Plan.LibraryId == libraryId)
                .Select(mp => new
                {
                    PlanName = mp.Plan.Name,
                })
                .FirstOrDefault(),

            //LastVisit = m.Attendances
            //    .Where(a => a.LibraryId == libraryId)
            //    .OrderByDescending(a => a.CheckInTime)
            //    .Select(a => (DateTime?)a.CheckInTime)
            //    .FirstOrDefault(),

            LastVisit = m.Attendances
                .Where(a => a.LibraryId == libraryId)
                .OrderByDescending(a => a.AttendanceDate)
                .Select(a => (DateOnly?)a.AttendanceDate)
                .FirstOrDefault(),

            Visits30d = m.Attendances.Count(a =>
                a.LibraryId == libraryId &&
                a.AttendanceDate >= thirtyDaysAgo)
        })
        .ToListAsync(cancellationToken);

        return members.Select(x =>
        {


            return new MemberListResponse
            {
                Id = x.Id,

                Name = x.fullName,
                UserName = x.UserName,
                Email = x.Email,
                Phone = x.Phone,

                Avatar =
                    $"https://api.dicebear.com/9.x/initials/svg?seed={Uri.EscapeDataString(x.fullName ?? x.UserName)}&backgroundType=gradientLinear",

                AvatarHue = 0,
                HasPhoto = !string.IsNullOrWhiteSpace(x.PhotoStoragePath),

                Institution = x.LibraryMapping?.InstitutionName ?? string.Empty,
                Branch = x.LibraryMapping?.BranchName ?? string.Empty,
                Library = x.LibraryMapping?.LibraryName ?? string.Empty,

                Membership = x.MembershipNo,

                Plan = x.CurrentPlan?.PlanName,
                Shift = x.Shift,

                Seat = x.LibraryMapping?.SeatNumber,
                SeatNumber = x.LibraryMapping?.SeatNumber,

                Status = x.IsActive ? "Active" : "Inactive",

                JoinDate = DateOnly.FromDateTime(
                    x.LibraryMapping?.JoinedOn ?? today),

                LastVisit = x.LastVisit.HasValue
                    ? x.LastVisit.Value
                    : null,

                Visits30d = x.Visits30d,

                // Calculate when attendance rules are finalized
                AttendanceRate = 0,

                // Calculate from payment/invoice table
                FeesOwed = 0
            };
        }).ToList();

    }

    public async Task<IReadOnlyCollection<MemberListResponse>> GetInstitutionMemberListAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        var institutionExists = await _dbContext.Institutions
            .AsNoTracking()
            .AnyAsync(x => x.Id == institutionId, cancellationToken);

        if (!institutionExists)
            throw new InvalidOperationException("Institution not found.");

        return await GetScopedMemberListAsync(institutionId, branchId: null, libraryId: null, cancellationToken);
    }

    public async Task<IReadOnlyCollection<MemberListResponse>> GetBranchMemberListAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        var branchExists = await _dbContext.Branches
            .AsNoTracking()
            .AnyAsync(x =>
                x.Id == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

        if (!branchExists)
            throw new InvalidOperationException("Branch not found.");

        return await GetScopedMemberListAsync(institutionId, branchId, libraryId: null, cancellationToken);
    }

    private async Task<IReadOnlyCollection<MemberListResponse>> GetScopedMemberListAsync(
        Guid institutionId,
        Guid? branchId,
        Guid? libraryId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var members = await _dbContext.Members
            .AsNoTracking()
            .Where(m => m.MemberLibraries.Any(ml =>
                ml.InstitutionId == institutionId &&
                ml.IsCurrent &&
                (branchId == null || ml.BranchId == branchId) &&
                (libraryId == null || ml.LibraryId == libraryId)))
            .Select(m => new
            {
                m.Id,
                m.IsActive,
                m.MembershipNo,
                m.Shift,
                m.PhotoStoragePath,
                fullName = m.User.FullName,
                UserName = m.User.UserName,
                Email = m.User.Email,
                Phone = m.User.PhoneNumber,
                LibraryMapping = m.MemberLibraries
                    .Where(ml =>
                        ml.InstitutionId == institutionId &&
                        ml.IsCurrent &&
                        (branchId == null || ml.BranchId == branchId) &&
                        (libraryId == null || ml.LibraryId == libraryId))
                    .Select(ml => new
                    {
                        InstitutionName = ml.Institution.Name,
                        BranchName = ml.Branch.Name,
                        LibraryName = ml.Library.Name,
                        ml.JoinedOn,
                        SeatNumber = ml.Seat != null ? ml.Seat.SeatNumber : null
                    })
                    .FirstOrDefault(),
                CurrentPlan = m.MemberPlans
                    .Where(mp =>
                        mp.IsCurrent &&
                        (libraryId == null || mp.Plan.LibraryId == libraryId))
                    .Select(mp => new
                    {
                        mp.PlanId,
                        PlanName = mp.Plan.Name,
                        mp.Plan.Price,
                        mp.Plan.DurationInDays,
                        mp.StartDate,
                        mp.EndDate
                    })
                    .FirstOrDefault(),
                LastVisit = m.Attendances
                    .Where(a => libraryId == null || a.LibraryId == libraryId)
                    .OrderByDescending(a => a.AttendanceDate)
                    .Select(a => (DateOnly?)a.AttendanceDate)
                    .FirstOrDefault(),
                Visits30d = m.Attendances.Count(a =>
                    (libraryId == null || a.LibraryId == libraryId) &&
                    a.AttendanceDate >= thirtyDaysAgo)
            })
            .ToListAsync(cancellationToken);

        return members.Select(x =>
        {
            var name = x.fullName?.Trim() ?? x.UserName?.Trim() ?? string.Empty;
            var joinedDate = x.LibraryMapping?.JoinedOn.Date ?? now.Date;
            var totalMembershipDays = Math.Max(1, (now.Date - joinedDate).Days + 1);
            var attendanceRate = Math.Min(
                Math.Round((decimal)x.Visits30d / totalMembershipDays * 100, 1),
                100);
            var currentPlan = x.CurrentPlan;
            var (daysRemaining, feesOwed, planStatus) = ComputePlanMetrics(
                currentPlan?.EndDate,
                currentPlan?.Price ?? 0,
                today);

            return new MemberListResponse
            {
                Id = x.Id,
                Name = name,
                UserName = x.UserName ?? string.Empty,
                Email = x.Email,
                Phone = x.Phone,
                Avatar = $"https://api.dicebear.com/9.x/initials/svg?seed={Uri.EscapeDataString(name)}&backgroundType=gradientLinear",
                AvatarHue = 0,
                HasPhoto = !string.IsNullOrWhiteSpace(x.PhotoStoragePath),
                Institution = x.LibraryMapping?.InstitutionName ?? string.Empty,
                Branch = x.LibraryMapping?.BranchName ?? string.Empty,
                Library = x.LibraryMapping?.LibraryName ?? string.Empty,
                Membership = x.MembershipNo,
                Plan = currentPlan?.PlanName,
                PlanId = currentPlan?.PlanId.ToString(),
                Shift = x.Shift,
                Seat = x.LibraryMapping?.SeatNumber,
                SeatNumber = x.LibraryMapping?.SeatNumber,
                Status = x.IsActive ? "Active" : "Inactive",
                PlanStatus = planStatus,
                JoinDate = DateOnly.FromDateTime(x.LibraryMapping?.JoinedOn ?? now),
                LastVisit = x.LastVisit,
                Visits30d = x.Visits30d,
                AttendanceRate = attendanceRate,
                FeesOwed = feesOwed,
                DaysRemaining = daysRemaining,
                PlanStartDate = currentPlan?.StartDate,
                PlanEndDate = currentPlan?.EndDate,
                PlanDurationInDays = currentPlan?.DurationInDays ?? 0
            };
        }).ToList();
    }

    public async Task<IReadOnlyCollection<MemberListResponse>> GetAllMemberListAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var members = await _dbContext.Members
            .AsNoTracking()
            .Select(m => new
            {
                m.Id,
                m.IsActive,
                m.MembershipNo,
                m.Shift,
                m.PhotoStoragePath,

                fullName = m.User.FullName,
                Email = m.User.Email,
                Phone = m.User.PhoneNumber,

                LibraryMapping = m.MemberLibraries
                    .Where(x => x.IsCurrent)
                    .Select(x => new
                    {
                        x.LibraryId,
                        InstitutionName = x.Institution.Name,
                        BranchName = x.Branch.Name,
                        LibraryName = x.Library.Name,
                        x.JoinedOn,

                        SeatNumber = x.Seat != null
                            ? x.Seat.SeatNumber
                            : null
                    })
                    .FirstOrDefault(),

                CurrentPlan = m.MemberPlans
                    .Where(x => x.IsCurrent)
                    .Select(x => new
                    {
                        x.PlanId,
                        PlanName = x.Plan.Name,
                        x.Plan.Price,
                        x.Plan.DurationInDays,
                        x.StartDate,
                        x.EndDate

                    })
                    .FirstOrDefault(),

                LastVisit = m.Attendances
                    .OrderByDescending(x => x.AttendanceDate)
                    .Select(x => (DateOnly?)x.AttendanceDate)
                    .FirstOrDefault(),

                Visits30d = m.Attendances.Count()
            })
            .ToListAsync(cancellationToken);

        return members
            .Select(x =>
            {
                var name = x.fullName?.Trim() ?? string.Empty;
                var joinedDate = x.LibraryMapping?.JoinedOn.Date ?? now.Date;
                var totalMembershipDays = Math.Max(1, (now.Date - joinedDate).Days + 1);
                var presentDays = x.Visits30d;
                var attendanceRate = Math.Round((decimal)presentDays / totalMembershipDays * 100, 1);
                attendanceRate = Math.Min(attendanceRate, 100);
                var currentPlan = x.CurrentPlan;

                var (daysRemaining, feesOwed, planStatus) = ComputePlanMetrics(
                    currentPlan?.EndDate,
                    currentPlan?.Price ?? 0,
                    today);


                return new MemberListResponse
                {
                    Id = x.Id,
                    Name = name,
                    Email = x.Email,
                    Phone = x.Phone,

                    Avatar =
                        $"https://api.dicebear.com/9.x/initials/svg?seed={Uri.EscapeDataString(name)}&backgroundType=gradientLinear",

                    AvatarHue = 0,
                    HasPhoto = !string.IsNullOrWhiteSpace(x.PhotoStoragePath),

                    Institution = x.LibraryMapping?.InstitutionName ?? string.Empty,
                    Branch = x.LibraryMapping?.BranchName ?? string.Empty,
                    Library = x.LibraryMapping?.LibraryName ?? string.Empty,

                    Membership = x.MembershipNo,

                    Plan = x.CurrentPlan?.PlanName,
                    PlanId = x.CurrentPlan?.PlanId.ToString(),
                    Shift = x.Shift,

                    Seat = x.LibraryMapping?.SeatNumber,
                    SeatNumber = x.LibraryMapping?.SeatNumber,

                    Status = x.IsActive ? "Active" : "Inactive",
                    PlanStatus = planStatus,

                    JoinDate = DateOnly.FromDateTime(x.LibraryMapping?.JoinedOn ?? now),
                    LastVisit = x.LastVisit.HasValue ? x.LastVisit.Value : null,
                    Visits30d = x.Visits30d,
                    AttendanceRate = attendanceRate,
                    FeesOwed = feesOwed,
                    DaysRemaining = daysRemaining,
                    PlanStartDate = currentPlan?.StartDate,
                    PlanEndDate = currentPlan?.EndDate,
                    PlanDurationInDays = currentPlan?.DurationInDays ?? 0
                };
            })
            .ToList();
    }

    public async Task<MemberDetailResponse?> GetMemberDetailsByIdAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var member = await _dbContext.Members
            .AsNoTracking()
            .Where(x => x.Id == memberId)
            .Select(m => new
            {
                m.Id,
                m.MembershipNo,
                m.IsActive,
                m.DateOfBirth,
                m.Gender,
                m.CreatedAtUtc,
                m.PhotoStoragePath,
                m.AadhaarStoragePath,

                Name = m.User.FullName,
                Email = m.User.Email,
                Phone = m.User.PhoneNumber,

                Shift = m.Shift.ToString(),

                Library = m.MemberLibraries
                    .Where(x => x.IsCurrent)
                    .Select(x => new
                    {
                        x.InstitutionId,
                        InstitutionName = x.Institution.Name,
                        x.BranchId,
                        BranchName = x.Branch.Name,
                        x.LibraryId,
                        LibraryName = x.Library.Name,
                        x.SeatId,
                        SeatNumber = x.Seat != null ? x.Seat.SeatNumber : null,
                        x.JoinedOn
                    })
                    .FirstOrDefault(),

                CurrentPlan = m.MemberPlans
                    .Where(x => x.IsCurrent)
                    .Select(x => new
                    {
                        x.PlanId,
                        PlanName = x.Plan.Name,
                        x.Plan.Price,
                        x.Plan.DurationInDays,
                        x.StartDate,
                        x.EndDate
                    })
            .FirstOrDefault()
            })
        .FirstOrDefaultAsync(cancellationToken);

        var contacts = await _dbContext.MemberGuardianContacts
            .AsNoTracking()
            .Where(x => x.MemberId == memberId && x.IsActive)
            .OrderByDescending(x => x.IsPrimary)
            .ToListAsync(cancellationToken);

        var plans = await _dbContext.MemberPlans
            .AsNoTracking()
            .Where(x => x.MemberId == memberId)
            .OrderByDescending(x => x.IsCurrent)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(mp => new MemberPlanResponse
            {
                Id = mp.Id,
                PlanId = mp.PlanId,
                PlanName = mp.Plan.Name,
                Price = mp.Amount,
                DurationInDays = mp.Plan.DurationInDays,
                StartDate = mp.StartDate,
                EndDate = mp.EndDate,
                PaidAmount = mp.PaidAmount,
                AdjustmentAmount = mp.AdjustmentAmount,
                PaymentStatus = "Paid",
                PaymentMethod = "Cash",
                IsCurrent = mp.IsCurrent,
                IsActive = mp.IsActive,
                CreatedAtUtc = mp.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var todayAttendance = await _dbContext.MemberAttendances
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.MemberId == memberId &&
                x.AttendanceDate == today,
                cancellationToken);

        var attendanceSummary = await _dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => x.MemberId == memberId)
            .GroupBy(x => x.MemberId)
            .Select(x => new
            {
                LastVisit = x.Max(a => a.AttendanceDate),

                Visits30d = x.Count(a =>
                    a.AttendanceDate >= thirtyDaysAgo)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var attendances = await _dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => x.MemberId == memberId)
            .CountAsync(cancellationToken);

        var recentAttendance = await _dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => x.MemberId == memberId && x.IsActive)
            .OrderByDescending(x => x.AttendanceDate)
            .ThenByDescending(x => x.CheckInTime)
            .Take(90)
            .Select(a => new AttendanceResponse
            {
                Id = a.Id,
                MemberId = a.MemberId,
                AttendanceDate = a.AttendanceDate,
                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime,
                DurationMinutes = a.DurationMinutes,
                Status = a.Status,
                Source = a.Source,
                SeatNo = a.SeatNo,
                Remarks = a.Remarks,
                IsActive = a.IsActive,
                CheckInAtUtc = a.CheckInTime.HasValue
                    ? a.AttendanceDate.ToDateTime(a.CheckInTime.Value, DateTimeKind.Utc)
                    : null,
                CheckOutAtUtc = a.CheckOutTime.HasValue
                    ? a.AttendanceDate.ToDateTime(a.CheckOutTime.Value, DateTimeKind.Utc)
                    : null,
            })
            .ToListAsync(cancellationToken);

        //await Task.WhenAll(memberTask, contactsTask, plansTask, todayAttendanceTask, attendanceSummaryTask, attendanceCountTask);

        if (member == null)
            return null;

        var joinedDate = member.Library?.JoinedOn.Date ?? now.Date;

        var totalMembershipDays = Math.Max(1, (now.Date - joinedDate).Days + 1);

        var attendanceRate = Math.Round((decimal)attendances / totalMembershipDays * 100, 1);

        attendanceRate = Math.Min(attendanceRate, 100);

        var currentPlan = plans.FirstOrDefault(x => x.IsCurrent);

        var (_, feesOwed, planStatus) = ComputePlanMetrics(
            currentPlan?.EndDate,
            currentPlan?.Price ?? 0,
            today);

        return new MemberDetailResponse
        {
            Id = member.Id,

            Name = member.Name,
            Email = member.Email,
            Phone = member.Phone,
            DateOfBirth = member.DateOfBirth,
            Gender = member.Gender.ToString(),
            MembershipNo = member.MembershipNo,
            IsActive = member.IsActive,
            Status = member.IsActive ? "Active" : "Inactive",
            PlanStatus = planStatus,
            InstitutionId = member.Library?.InstitutionId ?? Guid.Empty,
            Institution = member.Library?.InstitutionName ?? string.Empty,
            BranchId = member.Library?.BranchId ?? Guid.Empty,
            Branch = member.Library?.BranchName ?? string.Empty,
            LibraryId = member.Library?.LibraryId ?? Guid.Empty,
            Library = member.Library?.LibraryName ?? string.Empty,
            PlanId = member.CurrentPlan?.PlanId,
            Plan = member.CurrentPlan?.PlanName,
            PlanPrice = member.CurrentPlan?.Price,
            PlanStartDate = member.CurrentPlan?.StartDate,
            PlanEndDate = member.CurrentPlan?.EndDate,
            PlanDurationInDays = member.CurrentPlan?.DurationInDays ?? 0,
            Shift = member.Shift,
            SeatId = member.Library?.SeatId,
            SeatNumber = member.Library?.SeatNumber,
            JoinedOn = member.Library?.JoinedOn,
            LastVisit = attendanceSummary?.LastVisit,
            Visits30d = attendanceSummary?.Visits30d ?? 0,
            AttendanceRate = attendanceRate,
            PresentDays = attendances,
            TotalSessions = totalMembershipDays,
            FeesOwed = feesOwed,
            LastPaymentDate = member.CurrentPlan?.StartDate,
            DueDate = member.CurrentPlan?.EndDate,
            CreatedAtUtc = member.CreatedAtUtc,
            HasPhoto = !string.IsNullOrWhiteSpace(member.PhotoStoragePath),
            HasAadhaar = !string.IsNullOrWhiteSpace(member.AadhaarStoragePath),
            Contacts = contacts
                .Select(c => new MemberContactResponse
                {
                    Id = c.Id,
                    FullName = c.FullName,
                    PhoneNumber = c.PhoneNumber,
                    Email = c.Email,
                    Relation = c.Relation,
                    IsGuardian = c.IsGuardian,
                    IsEmergencyContact = c.IsEmergencyContact,
                    IsPrimary = c.IsPrimary,
                    IsActive = c.IsActive
                })
                .ToList(),
            Plans = plans.Select(mp => new MemberPlanResponse
            {
                Id = mp.Id,
                PlanId = mp.PlanId,
                PlanName = mp.PlanName,
                Price = mp.Price,
                DurationInDays = mp.DurationInDays,
                StartDate = mp.StartDate,
                EndDate = mp.EndDate,
                PaidAmount = mp.PaidAmount,
                AdjustmentAmount = mp.AdjustmentAmount,
                PaymentStatus = "Paid",
                PaymentMethod = "Cash",
                IsCurrent = mp.IsCurrent,
                IsActive = mp.IsActive,
                Status = !mp.IsActive ? "InActive" : planStatus.ToString(),
                CreatedAtUtc = mp.CreatedAtUtc
            }).ToList(),

            TodayAttendance = todayAttendance == null ? null : new AttendanceResponse
            {
                Id = todayAttendance.Id,
                MemberId = todayAttendance.MemberId,
                AttendanceDate = todayAttendance.AttendanceDate,
                CheckInTime = todayAttendance.CheckInTime,
                CheckOutTime = todayAttendance.CheckOutTime,
                DurationMinutes = todayAttendance.DurationMinutes,
                Status = todayAttendance.Status,
                Source = todayAttendance.Source,
                SeatNo = todayAttendance.SeatNo,
                Remarks = todayAttendance.Remarks,
                IsActive = todayAttendance.IsActive,
                CheckInAtUtc = todayAttendance.CheckInTime.HasValue
                        ? todayAttendance.AttendanceDate.ToDateTime(todayAttendance.CheckInTime.Value, DateTimeKind.Utc)
                        : null,

                CheckOutAtUtc = todayAttendance.CheckOutTime.HasValue
                        ? todayAttendance.AttendanceDate.ToDateTime(todayAttendance.CheckOutTime.Value, DateTimeKind.Utc)
                        : null,
            },
            Attendance = recentAttendance,
        };
    }

    private async Task<string> GenerateMembershipNumber(CancellationToken cancellationToken = default)
    {
        var currentYear = DateTime.UtcNow.Year;

        var lastMembershipNo = await _dbContext.Members
            .Where(x => x.MembershipNo.StartsWith($"MEM-{currentYear}-"))
            .OrderByDescending(x => x.MembershipNo)
            .Select(x => x.MembershipNo)
            .FirstOrDefaultAsync(cancellationToken);

        int nextNumber = 1;

        if (!string.IsNullOrWhiteSpace(lastMembershipNo))
        {
            var parts = lastMembershipNo.Split('-');

            if (parts.Length == 3 && int.TryParse(parts[2], out int lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
        }

        return $"MEM-{currentYear}-{nextNumber:D6}";
    }

    public async Task<MemberDetailResponse> UploadPhotoAsync(
        Guid memberId,
        IFormFile file,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("Photo file is empty.");
        }

        if (file.Length > MaxPhotoBytes)
        {
            throw new InvalidOperationException("Photo exceeds the 5 MB limit.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
        {
            throw new InvalidOperationException("Only JPG, PNG, or WEBP images are allowed.");
        }

        var member = await _dbContext.Members
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        DeletePhotoIfExists(member);

        var uploadRoot = Path.Combine(_environment.ContentRootPath, "uploads", "members");
        Directory.CreateDirectory(uploadRoot);

        var storagePath = Path.Combine(uploadRoot, $"{member.Id:N}{extension}");
        await using (var stream = File.Create(storagePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        member.PhotoStoragePath = storagePath;
        member.PhotoFileName = Path.GetFileName(file.FileName);
        member.UpdatedAtUtc = DateTime.UtcNow;
        member.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return (await GetMemberDetailsByIdAsync(memberId, cancellationToken))!;
    }

    public async Task<(string FilePath, string ContentType, string FileName)?> GetPhotoAsync(
        Guid memberId,
        CancellationToken cancellationToken = default)
    {
        var member = await _dbContext.Members.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken);

        if (member is null || string.IsNullOrWhiteSpace(member.PhotoStoragePath))
        {
            return null;
        }

        if (!File.Exists(member.PhotoStoragePath))
        {
            throw new InvalidOperationException("Photo file is missing on disk.");
        }

        var extension = Path.GetExtension(member.PhotoStoragePath).ToLowerInvariant();
        var contentType = extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg",
        };

        var fileName = string.IsNullOrWhiteSpace(member.PhotoFileName)
            ? $"{member.FullName}{extension}"
            : member.PhotoFileName;

        return (member.PhotoStoragePath, contentType, fileName);
    }

    private static void DeletePhotoIfExists(Domain.Entities.Member member)
    {
        if (string.IsNullOrWhiteSpace(member.PhotoStoragePath) || !File.Exists(member.PhotoStoragePath))
        {
            return;
        }

        File.Delete(member.PhotoStoragePath);
    }

    public async Task<MemberDetailResponse> UploadAadhaarAsync(
        Guid memberId,
        IFormFile file,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("Aadhaar document is empty.");
        }

        if (file.Length > MaxAadhaarBytes)
        {
            throw new InvalidOperationException("Aadhaar document exceeds the 10 MB limit.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp" or ".pdf"))
        {
            throw new InvalidOperationException("Only JPG, PNG, WEBP, or PDF files are allowed.");
        }

        var member = await _dbContext.Members
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        DeleteAadhaarIfExists(member);

        var uploadRoot = Path.Combine(_environment.ContentRootPath, "uploads", "members", "aadhaar");
        Directory.CreateDirectory(uploadRoot);

        var storagePath = Path.Combine(uploadRoot, $"{member.Id:N}{extension}");
        await using (var stream = File.Create(storagePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        member.AadhaarStoragePath = storagePath;
        member.AadhaarFileName = Path.GetFileName(file.FileName);
        member.UpdatedAtUtc = DateTime.UtcNow;
        member.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return (await GetMemberDetailsByIdAsync(memberId, cancellationToken))!;
    }

    public async Task<(string FilePath, string ContentType, string FileName)?> GetAadhaarAsync(
        Guid memberId,
        CancellationToken cancellationToken = default)
    {
        var member = await _dbContext.Members.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken);

        if (member is null || string.IsNullOrWhiteSpace(member.AadhaarStoragePath))
        {
            return null;
        }

        if (!File.Exists(member.AadhaarStoragePath))
        {
            throw new InvalidOperationException("Aadhaar document is missing on disk.");
        }

        var extension = Path.GetExtension(member.AadhaarStoragePath).ToLowerInvariant();
        var contentType = extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "image/jpeg",
        };

        var fileName = string.IsNullOrWhiteSpace(member.AadhaarFileName)
            ? $"aadhaar-{member.FullName}{extension}"
            : member.AadhaarFileName;

        return (member.AadhaarStoragePath, contentType, fileName);
    }

    private static void DeleteAadhaarIfExists(Domain.Entities.Member member)
    {
        if (string.IsNullOrWhiteSpace(member.AadhaarStoragePath) || !File.Exists(member.AadhaarStoragePath))
        {
            return;
        }

        File.Delete(member.AadhaarStoragePath);
    }

    private static MemberResponse ToCreateResponse(Domain.Entities.Member entity) =>
        new()
        {
            Id = entity.Id,
            FullName = entity.FullName,
            PhoneNumber = entity.PhoneNumber,
        };

    /// <summary>
    /// BR-06.1: signed days remaining; grace = expired ≤7 days with no dues.
    /// </summary>
    private static (int DaysRemaining, decimal FeesOwed, MemberPlanStatus PlanStatus) ComputePlanMetrics(
        DateOnly? planEndDate,
        decimal planPrice,
        DateOnly today)
    {
        if (planEndDate is null)
            return (0, 0, MemberPlanStatus.NoPlan);

        var daysRemaining = planEndDate.Value.DayNumber - today.DayNumber;

        if (daysRemaining > 7)
            return (daysRemaining, 0, MemberPlanStatus.Active);

        if (daysRemaining > 0)
            return (daysRemaining, 0, MemberPlanStatus.ExpiringSoon);

        if (daysRemaining == 0)
            return (0, 0, MemberPlanStatus.ExpiringSoon);

        var daysPast = Math.Abs(daysRemaining);
        if (daysPast <= 7)
            return (daysRemaining, 0, MemberPlanStatus.Expired);

        return (daysRemaining, planPrice, MemberPlanStatus.Expired);
    }

    private static decimal CalculateAdjustmentAmount(decimal currentPlanPrice, int currentPlanDurationInDays, DateOnly currentPlanEndDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Plan already expired
        if (currentPlanEndDate <= today) return 0;

        if (currentPlanDurationInDays <= 0) return 0;

        var remainingDays = currentPlanEndDate.DayNumber - today.DayNumber;

        var perDayRate = currentPlanPrice / currentPlanDurationInDays;

        var adjustmentAmount = perDayRate * remainingDays;

        return Math.Round(adjustmentAmount, 2, MidpointRounding.AwayFromZero);
    }
}
