
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
using SLMS_API.Application.Helpers;
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
    private readonly IPackageEntitlementService _packageEntitlementService;
    private readonly IAppEmailService _appEmailService;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MemberService> _logger;

    public MemberService(ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IAuthService authService,
        IConfiguration configuration,
        IAuditLogService auditLogService,
        ICurrentUserService currentUserService,
        IPackageEntitlementService packageEntitlementService,
        IAppEmailService appEmailService,
        IWebHostEnvironment environment,
        ILogger<MemberService> logger)
    {
        _dbContext = dbContext;
        _authService = authService;
        _currentUserService = currentUserService;
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _auditLogService = auditLogService;
        _packageEntitlementService = packageEntitlementService;
        _appEmailService = appEmailService;
        _environment = environment;
        _logger = logger;
    }

    public async Task<MemberResponse> CreateAsync(Guid institutionId, Guid branchId, Guid libraryId, CreateMemberRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        await _packageEntitlementService.EnsureCanCreateMemberAsync(_currentUserService.UserId, 1, cancellationToken);

        // Validate Phone Number (Required)
        var rawPhone = request.PhoneNumber?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawPhone) || !System.Text.RegularExpressions.Regex.IsMatch(rawPhone, @"^[6-9]\d{9}$"))
        {
            throw new InvalidOperationException("A valid 10-digit mobile number is required.");
        }

        // Email is optional
        var rawEmail = request.Email?.Trim();
        var hasEmail = !string.IsNullOrWhiteSpace(rawEmail);
        string effectiveEmail;
        string effectiveUserName;

        if (hasEmail)
        {
            if (await _userManager.FindByEmailAsync(rawEmail!) is not null)
                throw new InvalidOperationException($"A user with email '{rawEmail}' already exists.");

            effectiveEmail = rawEmail!;
            effectiveUserName = rawEmail!;
        }
        else
        {
            // Generate synthetic username & email for member without email
            effectiveUserName = rawPhone;
            effectiveEmail = $"{rawPhone}@member.lexora.local";

            // If existing user already has this phone/synthetic email, verify
            var existingByPhone = await _userManager.FindByNameAsync(effectiveUserName);
            if (existingByPhone is not null)
            {
                throw new InvalidOperationException($"A member account with phone number '{rawPhone}' already exists.");
            }
        }

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
                UserName = effectiveUserName,
                Email = effectiveEmail,
                PhoneNumber = rawPhone,
                EmailConfirmed = hasEmail,
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
            var membershipNo = await ResolveMembershipNoAsync(
                libraryId,
                request.MembershipNo,
                excludeMemberId: null,
                cancellationToken);

            var member = new Domain.Entities.Member
            {
                Id = Guid.NewGuid(),
                UserId = applicationUser.Id,
                FullName = request.FullName,
                PhoneNumber = request.PhoneNumber,
                MembershipNo = membershipNo,
                DateOfBirth = request.DateOfBirth.HasValue ? DateOnly.FromDateTime(request.DateOfBirth.Value) : null,
                Gender = request.Gender,
                Shift = request.Shift,
                AttendanceQrToken = Guid.NewGuid().ToString("N"),
                CreatedBy = _currentUserService.UserId
            };

            await _dbContext.Members.AddAsync(member, cancellationToken);

            // 3. Assign Plan
            var (startDate, endDate) = ResolveMemberPlanDates(
                request.PlanStartDate,
                request.PlanEndDate,
                plan.DurationInDays,
                DateTime.UtcNow);

            var (paidAmount, adjustmentAmount, dueAmount) = MemberPlanMetricsHelper.ResolvePlanMoney(
                plan.Price,
                request.PaidAmount,
                request.DueAmount,
                plan.Price);

            await _dbContext.MemberPlans.AddAsync(new MemberPlan
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                PlanId = request.PlanId,
                StartDate = startDate,
                EndDate = endDate,
                Amount = plan.Price,
                PaidAmount = paidAmount,
                AdjustmentAmount = adjustmentAmount,
                DueAmount = dueAmount,
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

            // Send Welcome Email to Member with Credentials if email is provided
            if (hasEmail)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var libraryName = await _dbContext.Libraries
                            .Where(l => l.Id == libraryId)
                            .Select(l => l.Name)
                            .FirstOrDefaultAsync();

                        await _appEmailService.SendMemberWelcomeAsync(
                            applicationUser.Email,
                            applicationUser.FullName ?? "Member",
                            member.MembershipNo,
                            libraryName,
                            plan.Name,
                            defaultPassword,
                            CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send welcome email to member {Email}", applicationUser.Email);
                    }
                });
            }

            return ToCreateResponse(member);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<byte[]> GetBulkUploadTemplateAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default)
    {
        var libraryExists = await _dbContext.Libraries.AsNoTracking()
            .AnyAsync(x => x.Id == libraryId && x.BranchId == branchId && x.InstitutionId == institutionId, cancellationToken);

        if (!libraryExists)
        {
            throw new InvalidOperationException("Library not found for the selected institution and branch.");
        }

        var plans = await _dbContext.Plans.AsNoTracking()
            .Where(x => x.LibraryId == libraryId && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new { x.Name, x.DurationInDays, x.Price })
            .ToListAsync(cancellationToken);

        return MemberBulkExcelHelper.GenerateTemplate(
            plans.Select(x => (x.Name, x.DurationInDays, x.Price)));
    }

    public async Task<BulkMemberUploadResponse> BulkCreateAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        IFormFile file,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (file is null || file.Length == 0)
        {
            throw new InvalidOperationException("Please upload an Excel file.");
        }

        var extension = Path.GetExtension(file.FileName);
        if (!string.Equals(extension, ".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only .xlsx Excel files are supported.");
        }

        const long maxBytes = 5 * 1024 * 1024;
        if (file.Length > maxBytes)
        {
            throw new InvalidOperationException("File size must be 5 MB or smaller.");
        }

        var libraryExists = await _dbContext.Libraries.AsNoTracking()
            .AnyAsync(x => x.Id == libraryId && x.BranchId == branchId && x.InstitutionId == institutionId, cancellationToken);

        if (!libraryExists)
        {
            throw new InvalidOperationException("Library not found for the selected institution and branch.");
        }

        IReadOnlyList<BulkMemberExcelRow> rows;
        await using (var stream = file.OpenReadStream())
        {
            rows = MemberBulkExcelHelper.Parse(stream);
        }

        if (rows.Count == 0)
        {
            throw new InvalidOperationException("No member rows found in the uploaded file.");
        }

        await _packageEntitlementService.EnsureCanCreateMemberAsync(_currentUserService.UserId, rows.Count, cancellationToken);

        var plans = await _dbContext.Plans.AsNoTracking()
            .Where(x => x.LibraryId == libraryId && x.IsActive)
            .ToListAsync(cancellationToken);

        var planByName = plans.ToDictionary(x => x.Name.Trim(), x => x, StringComparer.OrdinalIgnoreCase);

        var results = new List<BulkMemberUploadRowResult>();
        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenPhones = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var validationError = MemberBulkExcelHelper.ValidateRow(row);
            if (validationError is not null)
            {
                results.Add(new BulkMemberUploadRowResult
                {
                    RowNumber = row.RowNumber,
                    FullName = row.FullName,
                    Email = row.Email,
                    Success = false,
                    Message = validationError
                });
                continue;
            }

            var normalizedPhone = row.PhoneNumber.Trim();
            if (!seenPhones.Add(normalizedPhone))
            {
                results.Add(new BulkMemberUploadRowResult
                {
                    RowNumber = row.RowNumber,
                    FullName = row.FullName,
                    Email = row.Email,
                    Success = false,
                    Message = $"Duplicate phone number '{normalizedPhone}' found in the uploaded file."
                });
                continue;
            }

            var normalizedEmail = row.Email?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedEmail))
            {
                if (!seenEmails.Add(normalizedEmail))
                {
                    results.Add(new BulkMemberUploadRowResult
                    {
                        RowNumber = row.RowNumber,
                        FullName = row.FullName,
                        Email = normalizedEmail,
                        Success = false,
                        Message = $"Duplicate email '{normalizedEmail}' found in the uploaded file."
                    });
                    continue;
                }
            }

            if (!planByName.TryGetValue(row.PlanName.Trim(), out var plan))
            {
                results.Add(new BulkMemberUploadRowResult
                {
                    RowNumber = row.RowNumber,
                    FullName = row.FullName,
                    Email = normalizedEmail ?? string.Empty,
                    Success = false,
                    Message = $"Plan '{row.PlanName}' was not found for this library."
                });
                continue;
            }

            try
            {
                var request = new CreateMemberRequest
                {
                    FullName = row.FullName.Trim(),
                    Email = !string.IsNullOrWhiteSpace(normalizedEmail) ? normalizedEmail : null,
                    PhoneNumber = normalizedPhone,
                    DateOfBirth = row.DateOfBirth,
                    Gender = row.Gender.Trim(),
                    Shift = row.Shift.Trim(),
                    PlanId = plan.Id,
                    IsActive = true
                };

                var created = await CreateAsync(institutionId, branchId, libraryId, request, userId, cancellationToken);
                results.Add(new BulkMemberUploadRowResult
                {
                    RowNumber = row.RowNumber,
                    FullName = row.FullName,
                    Email = normalizedEmail ?? string.Empty,
                    Success = true,
                    Message = "Member created successfully.",
                    MemberId = created.Id
                });
            }
            catch (InvalidOperationException ex)
            {
                results.Add(new BulkMemberUploadRowResult
                {
                    RowNumber = row.RowNumber,
                    FullName = row.FullName,
                    Email = normalizedEmail ?? string.Empty,
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        return new BulkMemberUploadResponse
        {
            TotalRows = rows.Count,
            SuccessCount = results.Count(x => x.Success),
            FailedCount = results.Count(x => !x.Success),
            Results = results
        };
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
        var hasDueUpdate = request.DueAmount.HasValue || request.PayDueAmount.HasValue;

        // At least one required
        if (!hasPlan && !hasShift && !hasDueUpdate)
        {
            throw new InvalidOperationException("Please provide PlanId, Shift, DueAmount, or PayDueAmount.");
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

                var (startDate, endDate) = ResolveMemberPlanDates(
                    request.StartDate,
                    request.EndDate,
                    newPlan.DurationInDays,
                    now);

                // Plan − Paid without Due → Adjustment (discount). Due is only manual.
                // Prior plan-change credit is folded into Adjustment via lower default paid.
                var (paidAmount, discountAdjustment, dueAmount) = MemberPlanMetricsHelper.ResolvePlanMoney(
                    newPlan.Price,
                    request.PaidAmount,
                    request.DueAmount,
                    amountToPay);

                // Create new plan history
                var memberPlan = new MemberPlan
                {
                    Id = Guid.NewGuid(),
                    MemberId = member.Id,
                    PlanId = newPlan.Id,

                    StartDate = startDate,
                    EndDate = endDate,
                    AdjustmentAmount = discountAdjustment,
                    Amount = newPlan.Price,
                    PaidAmount = paidAmount,
                    DueAmount = dueAmount,

                    IsCurrent = true,
                    IsActive = true,

                    CreatedAtUtc = now,
                    CreatedBy = userId
                };

                await _dbContext.MemberPlans.AddAsync(memberPlan, cancellationToken);
            //}
        }

        // Manual due set / due payment on current plan (without requiring a plan change)
        if (hasDueUpdate)
        {
            var currentPlanForDue = member.MemberPlans
                .FirstOrDefault(x => x.IsCurrent && x.IsActive);

            if (currentPlanForDue is null && !hasPlan)
            {
                throw new InvalidOperationException("Member has no active plan to update dues.");
            }

            // If we just created a new plan above, dues were already applied on that row.
            if (!hasPlan && currentPlanForDue is not null)
            {
                if (request.DueAmount.HasValue)
                {
                    var (_, adjustment, due) = MemberPlanMetricsHelper.ResolvePlanMoney(
                        currentPlanForDue.Amount,
                        currentPlanForDue.PaidAmount,
                        request.DueAmount,
                        currentPlanForDue.PaidAmount);
                    currentPlanForDue.DueAmount = due;
                    currentPlanForDue.AdjustmentAmount = adjustment;
                    currentPlanForDue.UpdatedAtUtc = now;
                    currentPlanForDue.UpdatedBy = userId;
                }

                if (request.PayDueAmount.HasValue)
                {
                    var pay = Math.Round(Math.Max(0, request.PayDueAmount.Value), 2, MidpointRounding.AwayFromZero);
                    if (pay <= 0)
                    {
                        throw new InvalidOperationException("Pay due amount must be greater than zero.");
                    }

                    var apply = Math.Min(pay, currentPlanForDue.DueAmount);
                    currentPlanForDue.PaidAmount = Math.Round(currentPlanForDue.PaidAmount + apply, 2, MidpointRounding.AwayFromZero);
                    currentPlanForDue.DueAmount = Math.Max(0, Math.Round(currentPlanForDue.DueAmount - apply, 2, MidpointRounding.AwayFromZero));
                    currentPlanForDue.AdjustmentAmount = Math.Max(
                        0,
                        Math.Round(currentPlanForDue.Amount - currentPlanForDue.PaidAmount - currentPlanForDue.DueAmount, 2, MidpointRounding.AwayFromZero));
                    currentPlanForDue.UpdatedAtUtc = now;
                    currentPlanForDue.UpdatedBy = userId;
                }
            }
        }

        member.UpdatedAtUtc = now;
        member.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetMemberDetailsByIdAsync(memberId, cancellationToken) ?? throw new InvalidOperationException("Unable to retrieve member details.");

    }

    public async Task<MemberDetailResponse> RenewMembershipAsync(
        Guid memberId,
        ChangeMemberPlanShiftRequest? request,
        string? userId,
        CancellationToken cancellationToken = default)
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
            new ChangeMemberPlanShiftRequest
            {
                PlanId = request?.PlanId ?? member.CurrentPlanId,
                StartDate = request?.StartDate,
                EndDate = request?.EndDate,
                PaidAmount = request?.PaidAmount,
                DueAmount = request?.DueAmount,
                PayDueAmount = request?.PayDueAmount,
            },
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
        var userId = await RequireCurrentUserIdAsync(cancellationToken);
        var scope = await ResolveMemberAccessScopeAsync(userId, cancellationToken);

        var libraryExists = await _dbContext.Libraries
            .AsNoTracking()
            .AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

        if (!libraryExists)
            throw new InvalidOperationException("Library not found.");

        if (!CanAccessLibrary(institutionId, branchId, libraryId, scope))
            throw new UnauthorizedAccessException("You do not have access to this library.");

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
            Email = m.User.Email != null && m.User.Email.EndsWith("@member.lexora.local") ? null : m.User.Email,
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
        var userId = await RequireCurrentUserIdAsync(cancellationToken);
        var scope = await ResolveMemberAccessScopeAsync(userId, cancellationToken);

        var institutionExists = await _dbContext.Institutions
            .AsNoTracking()
            .AnyAsync(x => x.Id == institutionId, cancellationToken);

        if (!institutionExists)
            throw new InvalidOperationException("Institution not found.");

        if (!await CanAccessInstitutionAsync(institutionId, scope, cancellationToken))
            throw new UnauthorizedAccessException("You do not have access to this institution.");

        return await GetScopedMemberListAsync(institutionId, branchId: null, libraryId: null, scope, cancellationToken);
    }

    public async Task<IReadOnlyCollection<MemberListResponse>> GetBranchMemberListAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        var userId = await RequireCurrentUserIdAsync(cancellationToken);
        var scope = await ResolveMemberAccessScopeAsync(userId, cancellationToken);

        var branchExists = await _dbContext.Branches
            .AsNoTracking()
            .AnyAsync(x =>
                x.Id == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

        if (!branchExists)
            throw new InvalidOperationException("Branch not found.");

        if (!CanAccessBranch(institutionId, branchId, scope))
            throw new UnauthorizedAccessException("You do not have access to this branch.");

        return await GetScopedMemberListAsync(institutionId, branchId, libraryId: null, scope, cancellationToken);
    }

    private async Task<IReadOnlyCollection<MemberListResponse>> GetScopedMemberListAsync(
        Guid institutionId,
        Guid? branchId,
        Guid? libraryId,
        MemberAccessScope scope,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var membersQuery = ApplyMemberAccessScope(_dbContext.Members.AsNoTracking(), scope);

        var members = await membersQuery
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
                Email = m.User.Email != null && m.User.Email.EndsWith("@member.lexora.local") ? null : m.User.Email,
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
                        Amount = mp.Amount,
                        PaidAmount = mp.PaidAmount,
                        AdjustmentAmount = mp.AdjustmentAmount ?? 0,
                        DueAmount = mp.DueAmount,
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
            var planAmount = currentPlan?.Amount > 0 ? currentPlan.Amount : (currentPlan?.Price ?? 0);
            var paidAmount = currentPlan?.PaidAmount ?? 0;
            var adjustmentAmount = currentPlan?.AdjustmentAmount ?? 0;
            var dueAmount = currentPlan?.DueAmount ?? 0;
            var (daysRemaining, _, planStatus) = MemberPlanMetricsHelper.ComputePlanMetrics(
                currentPlan?.EndDate,
                planAmount,
                today);
            var feesOwed = MemberPlanMetricsHelper.ComputeMemberFeesOwed(dueAmount);

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
                PlanPrice = planAmount,
                PaidAmount = paidAmount,
                AdjustmentAmount = adjustmentAmount,
                DueAmount = dueAmount,
                DaysRemaining = daysRemaining,
                PlanStartDate = currentPlan?.StartDate,
                PlanEndDate = currentPlan?.EndDate,
                PlanDurationInDays = currentPlan?.DurationInDays ?? 0
            };
        }).ToList();
    }

    public async Task<IReadOnlyCollection<MemberListResponse>> GetAllMemberListAsync(CancellationToken cancellationToken = default)
    {
        var userId = await RequireCurrentUserIdAsync(cancellationToken);
        var scope = await ResolveMemberAccessScopeAsync(userId, cancellationToken);

        var now = DateTime.UtcNow;
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var membersQuery = ApplyMemberAccessScope(_dbContext.Members.AsNoTracking(), scope);

        var members = await membersQuery
            .Select(m => new
            {
                m.Id,
                m.IsActive,
                m.MembershipNo,
                m.Shift,
                m.PhotoStoragePath,

                fullName = m.User.FullName,
                Email = m.User.Email != null && m.User.Email.EndsWith("@member.lexora.local") ? null : m.User.Email,
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
                        Amount = x.Amount,
                        PaidAmount = x.PaidAmount,
                        AdjustmentAmount = x.AdjustmentAmount ?? 0,
                        DueAmount = x.DueAmount,
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

                var planAmount = currentPlan?.Amount > 0 ? currentPlan.Amount : (currentPlan?.Price ?? 0);
                var paidAmount = currentPlan?.PaidAmount ?? 0;
                var adjustmentAmount = currentPlan?.AdjustmentAmount ?? 0;
                var dueAmount = currentPlan?.DueAmount ?? 0;
                var (daysRemaining, _, planStatus) = MemberPlanMetricsHelper.ComputePlanMetrics(
                    currentPlan?.EndDate,
                    planAmount,
                    today);
                var feesOwed = MemberPlanMetricsHelper.ComputeMemberFeesOwed(dueAmount);


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
                    PlanPrice = planAmount,
                    PaidAmount = paidAmount,
                    AdjustmentAmount = adjustmentAmount,
                    DueAmount = dueAmount,
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
                Email = m.User.Email != null && m.User.Email.EndsWith("@member.lexora.local") ? null : m.User.Email,
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
                        Amount = x.Amount,
                        PaidAmount = x.PaidAmount,
                        AdjustmentAmount = x.AdjustmentAmount ?? 0,
                        DueAmount = x.DueAmount,
                        x.Plan.DurationInDays,
                        x.StartDate,
                        x.EndDate
                    })
            .FirstOrDefault()
            })
        .FirstOrDefaultAsync(cancellationToken);

        if (member is null)
        {
            return null;
        }

        var userId = await RequireCurrentUserIdAsync(cancellationToken);
        var userIdString = userId.ToString();
        var ownMemberId = await GetMemberIdForUserAsync(userIdString, cancellationToken);

        if (ownMemberId != memberId)
        {
            var scope = await ResolveMemberAccessScopeAsync(userId, cancellationToken);
            if (!CanAccessMemberLibrary(member.Library?.InstitutionId, member.Library?.BranchId, member.Library?.LibraryId, scope))
            {
                return null;
            }
        }

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
                DueAmount = mp.DueAmount,
                PaymentStatus = mp.DueAmount <= 0 && (mp.PaidAmount > 0 || mp.Amount <= 0)
                    ? "Paid"
                    : mp.PaidAmount > 0 ? "Partial" : "Pending",
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
        var planAmount = currentPlan?.Price ?? member.CurrentPlan?.Price ?? 0;
        // MemberPlanResponse.Price is mapped from Amount
        var paidOnPlan = currentPlan?.PaidAmount ?? 0;
        var adjustmentOnPlan = currentPlan?.AdjustmentAmount ?? member.CurrentPlan?.AdjustmentAmount ?? 0;
        var dueOnPlan = currentPlan?.DueAmount ?? member.CurrentPlan?.DueAmount ?? 0;

        var (_, _, planStatus) = MemberPlanMetricsHelper.ComputePlanMetrics(
            currentPlan?.EndDate ?? member.CurrentPlan?.EndDate,
            planAmount,
            today);
        var feesOwed = MemberPlanMetricsHelper.ComputeMemberFeesOwed(dueOnPlan);

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
            PlanPrice = planAmount,
            PlanPaidAmount = paidOnPlan,
            PlanAdjustmentAmount = adjustmentOnPlan,
            PlanDueAmount = dueOnPlan,
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
                DueAmount = mp.DueAmount,
                PaymentStatus = mp.DueAmount <= 0 && (mp.PaidAmount > 0 || mp.Price <= 0)
                    ? "Paid"
                    : mp.PaidAmount > 0 ? "Partial" : "Pending",
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

    public async Task<Guid?> GetCurrentMemberIdAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await GetMemberIdForUserAsync(_currentUserService.UserId, cancellationToken);
    }

    private async Task<Guid?> GetMemberIdForUserAsync(string userId, CancellationToken cancellationToken) =>
        await _dbContext.Members
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefaultAsync(cancellationToken);

    private sealed record MemberAccessScope(
        bool IsSuperAdmin,
        IReadOnlyCollection<Guid> InstitutionIds,
        IReadOnlyCollection<Guid> BranchIds,
        IReadOnlyCollection<Guid> LibraryIds);

    private async Task<Guid> RequireCurrentUserIdAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentUserService.UserId) ||
            !Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return userId;
    }

    private async Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var userIdString = userId.ToString();

        return await (
            from ur in _dbContext.UserRoles.AsNoTracking()
            join role in _dbContext.Roles.AsNoTracking() on ur.RoleId equals role.Id
            where ur.UserId == userIdString && role.Name == RoleDefinitions.SuperAdmin
            select ur.UserId
        ).AnyAsync(cancellationToken);
    }

    private async Task<bool> IsOrganisationAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var userIdString = userId.ToString();

        return await (
            from ur in _dbContext.UserRoles.AsNoTracking()
            join role in _dbContext.Roles.AsNoTracking() on ur.RoleId equals role.Id
            where ur.UserId == userIdString && role.Name == RoleDefinitions.OrganisationAdmin
            select ur.UserId
        ).AnyAsync(cancellationToken);
    }

    private async Task<bool> CanChangeAccountPasswordAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await IsSuperAdminAsync(userId, cancellationToken)
            || await IsOrganisationAdminAsync(userId, cancellationToken);
    }

    private async Task<MemberAccessScope> ResolveMemberAccessScopeAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken))
        {
            return new MemberAccessScope(true, [], [], []);
        }

        var userIdString = userId.ToString();
        var institutionIds = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(x => x.UserId == userIdString && x.IsActive)
            .Select(x => x.InstitutionId)
            .ToListAsync(cancellationToken);

        var branchIds = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(x => x.UserId == userIdString && x.IsActive)
            .Select(x => x.BranchId)
            .ToListAsync(cancellationToken);

        var libraryIds = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(x => x.UserId == userIdString && x.IsActive)
            .Select(x => x.LibraryId)
            .ToListAsync(cancellationToken);

        return new MemberAccessScope(false, institutionIds, branchIds, libraryIds);
    }

    private static IQueryable<Domain.Entities.Member> ApplyMemberAccessScope(
        IQueryable<Domain.Entities.Member> query,
        MemberAccessScope scope)
    {
        if (scope.IsSuperAdmin)
        {
            return query;
        }

        if (scope.InstitutionIds.Count == 0 &&
            scope.BranchIds.Count == 0 &&
            scope.LibraryIds.Count == 0)
        {
            return query.Where(_ => false);
        }

        return query.Where(m => m.MemberLibraries.Any(ml =>
            ml.IsCurrent &&
            (scope.InstitutionIds.Contains(ml.InstitutionId) ||
             scope.BranchIds.Contains(ml.BranchId) ||
             scope.LibraryIds.Contains(ml.LibraryId))));
    }

    private static bool CanAccessBranch(Guid institutionId, Guid branchId, MemberAccessScope scope) =>
        scope.IsSuperAdmin ||
        scope.InstitutionIds.Contains(institutionId) ||
        scope.BranchIds.Contains(branchId);

    private static bool CanAccessLibrary(Guid institutionId, Guid branchId, Guid libraryId, MemberAccessScope scope) =>
        scope.IsSuperAdmin ||
        scope.InstitutionIds.Contains(institutionId) ||
        scope.BranchIds.Contains(branchId) ||
        scope.LibraryIds.Contains(libraryId);

    private async Task<bool> CanAccessInstitutionAsync(
        Guid institutionId,
        MemberAccessScope scope,
        CancellationToken cancellationToken)
    {
        if (scope.IsSuperAdmin || scope.InstitutionIds.Contains(institutionId))
        {
            return true;
        }

        if (scope.BranchIds.Count > 0 &&
            await _dbContext.Branches.AsNoTracking().AnyAsync(
                b => b.InstitutionId == institutionId && scope.BranchIds.Contains(b.Id),
                cancellationToken))
        {
            return true;
        }

        if (scope.LibraryIds.Count > 0 &&
            await _dbContext.Libraries.AsNoTracking().AnyAsync(
                l => l.InstitutionId == institutionId && scope.LibraryIds.Contains(l.Id),
                cancellationToken))
        {
            return true;
        }

        return false;
    }

    private static bool CanAccessMemberLibrary(
        Guid? institutionId,
        Guid? branchId,
        Guid? libraryId,
        MemberAccessScope scope)
    {
        if (scope.IsSuperAdmin)
        {
            return true;
        }

        if (!institutionId.HasValue || !branchId.HasValue || !libraryId.HasValue)
        {
            return false;
        }

        return CanAccessLibrary(institutionId.Value, branchId.Value, libraryId.Value, scope);
    }

    private async Task<string> ResolveMembershipNoAsync(
        Guid libraryId,
        string? requestedMembershipNo,
        Guid? excludeMemberId,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(requestedMembershipNo))
        {
            var custom = NormalizeMembershipNo(requestedMembershipNo);
            ValidateMembershipNoFormat(custom);
            await EnsureMembershipNoUniqueInLibraryAsync(libraryId, custom, excludeMemberId, cancellationToken);
            return custom;
        }

        // Keep existing number on update when client sends blank intentionally? For create blank = auto.
        // Update path always passes non-null when field is sent; empty string means regenerate is not wanted —
        // callers should omit or send current value. Empty after normalize = auto only on create (excludeMemberId null).
        if (excludeMemberId.HasValue && requestedMembershipNo is not null && string.IsNullOrWhiteSpace(requestedMembershipNo))
        {
            throw new InvalidOperationException("Membership ID cannot be empty.");
        }

        return await GenerateMembershipNumberForLibraryAsync(libraryId, cancellationToken);
    }

    private static string NormalizeMembershipNo(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static void ValidateMembershipNoFormat(string membershipNo)
    {
        if (membershipNo.Length < 2 || membershipNo.Length > 40)
        {
            throw new InvalidOperationException("Member ID must be between 2 and 40 characters.");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(membershipNo, @"^[A-Z0-9][A-Z0-9._\-]*$"))
        {
            throw new InvalidOperationException(
                "Member ID may only contain letters, numbers, dots, hyphens, and underscores.");
        }
    }

    private async Task EnsureMembershipNoUniqueInLibraryAsync(
        Guid libraryId,
        string membershipNo,
        Guid? excludeMemberId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.MemberLibraries
            .AsNoTracking()
            .Where(ml =>
                ml.LibraryId == libraryId &&
                ml.IsCurrent &&
                !ml.IsDeleted &&
                ml.Member != null &&
                !ml.Member.IsDeleted);

        if (excludeMemberId.HasValue)
        {
            query = query.Where(ml => ml.MemberId != excludeMemberId.Value);
        }

        var duplicate = await query
            .AnyAsync(
                ml => ml.Member.MembershipNo.ToLower() == membershipNo.ToLower(),
                cancellationToken);

        if (duplicate)
        {
            throw new InvalidOperationException(
                $"Member ID '{membershipNo}' is already used in this library. Choose a different ID.");
        }
    }

    private async Task<string> GenerateMembershipNumberForLibraryAsync(
        Guid libraryId,
        CancellationToken cancellationToken = default)
    {
        var libraryName = await _dbContext.Libraries.AsNoTracking()
            .Where(x => x.Id == libraryId)
            .Select(x => x.Name)
            .FirstOrDefaultAsync(cancellationToken);

        var prefix = BuildLibraryMembershipPrefix(libraryName, libraryId);

        var existingNumbers = await _dbContext.MemberLibraries
            .AsNoTracking()
            .Where(ml =>
                ml.LibraryId == libraryId &&
                ml.IsCurrent &&
                !ml.IsDeleted &&
                ml.Member != null &&
                !ml.Member.IsDeleted)
            .Select(ml => ml.Member.MembershipNo)
            .ToListAsync(cancellationToken);

        var nextNumber = 1;
        foreach (var existing in existingNumbers)
        {
            if (string.IsNullOrWhiteSpace(existing))
            {
                continue;
            }

            // Prefer PREFIX-##### sequence for this library; also accept any trailing digits.
            if (existing.StartsWith(prefix + "-", StringComparison.OrdinalIgnoreCase))
            {
                var suffix = existing[(prefix.Length + 1)..];
                if (int.TryParse(suffix, out var parsed) && parsed >= nextNumber)
                {
                    nextNumber = parsed + 1;
                }
            }
            else
            {
                var match = System.Text.RegularExpressions.Regex.Match(existing, @"(\d+)$");
                if (match.Success &&
                    int.TryParse(match.Groups[1].Value, out var trailing) &&
                    trailing >= nextNumber)
                {
                    nextNumber = trailing + 1;
                }
            }
        }

        string candidate;
        do
        {
            candidate = $"{prefix}-{nextNumber:D5}";
            nextNumber++;
        }
        while (existingNumbers.Any(x =>
            string.Equals(x, candidate, StringComparison.OrdinalIgnoreCase)));

        return candidate;
    }

    private static string BuildLibraryMembershipPrefix(string? libraryName, Guid libraryId)
    {
        if (!string.IsNullOrWhiteSpace(libraryName))
        {
            var letters = new string(libraryName
                .Where(char.IsLetterOrDigit)
                .Select(char.ToUpperInvariant)
                .ToArray());

            if (letters.Length >= 2)
            {
                return letters.Length > 8 ? letters[..8] : letters;
            }
        }

        return $"LIB{libraryId.ToString("N")[..4].ToUpperInvariant()}";
    }

    public async Task<MemberDetailResponse> UpdateAsync(
        Guid memberId,
        UpdateMemberRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var member = await _dbContext.Members
            .Include(x => x.User)
            .Include(x => x.MemberLibraries)
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        var currentLibrary = member.MemberLibraries.FirstOrDefault(x => x.IsCurrent);
        var currentUserId = await RequireCurrentUserIdAsync(cancellationToken);
        var scope = await ResolveMemberAccessScopeAsync(currentUserId, cancellationToken);

        if (!CanAccessMemberLibrary(currentLibrary?.InstitutionId, currentLibrary?.BranchId, currentLibrary?.LibraryId, scope))
        {
            throw new UnauthorizedAccessException("You do not have access to update this member.");
        }

        var hasChanges = false;

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            var fullName = request.FullName.Trim();
            if (fullName.Length < 2 || fullName.Length > 100)
            {
                throw new InvalidOperationException("Full name must be between 2 and 100 characters.");
            }

            if (!string.Equals(member.FullName, fullName, StringComparison.Ordinal))
            {
                member.FullName = fullName;
                member.User.FullName = fullName;
                hasChanges = true;
            }
        }

        // Email update handling (can add, change, or remove)
        if (request.Email != null)
        {
            var email = request.Email.Trim();
            if (!string.IsNullOrWhiteSpace(email))
            {
                if (!string.Equals(member.User.Email, email, StringComparison.OrdinalIgnoreCase))
                {
                    var existingUser = await _userManager.FindByEmailAsync(email);
                    if (existingUser is not null && existingUser.Id != member.UserId)
                    {
                        throw new InvalidOperationException($"A user with email '{email}' already exists.");
                    }

                    var setEmailResult = await _userManager.SetEmailAsync(member.User, email);
                    if (!setEmailResult.Succeeded)
                    {
                        throw new InvalidOperationException(string.Join(Environment.NewLine, setEmailResult.Errors.Select(x => x.Description)));
                    }

                    var setUserNameResult = await _userManager.SetUserNameAsync(member.User, email);
                    if (!setUserNameResult.Succeeded)
                    {
                        throw new InvalidOperationException(string.Join(Environment.NewLine, setUserNameResult.Errors.Select(x => x.Description)));
                    }

                    member.User.EmailConfirmed = true;
                    hasChanges = true;
                }
            }
            else
            {
                // Cleared email -> revert to synthetic email using phone
                var phone = !string.IsNullOrWhiteSpace(request.PhoneNumber) ? request.PhoneNumber.Trim() : member.PhoneNumber;
                var syntheticUserName = phone;
                var syntheticEmail = $"{phone}@member.lexora.local";

                if (!string.Equals(member.User.Email, syntheticEmail, StringComparison.OrdinalIgnoreCase))
                {
                    var setEmailResult = await _userManager.SetEmailAsync(member.User, syntheticEmail);
                    if (!setEmailResult.Succeeded)
                    {
                        throw new InvalidOperationException(string.Join(Environment.NewLine, setEmailResult.Errors.Select(x => x.Description)));
                    }

                    var setUserNameResult = await _userManager.SetUserNameAsync(member.User, syntheticUserName);
                    if (!setUserNameResult.Succeeded)
                    {
                        throw new InvalidOperationException(string.Join(Environment.NewLine, setUserNameResult.Errors.Select(x => x.Description)));
                    }

                    member.User.EmailConfirmed = false;
                    hasChanges = true;
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            var phoneNumber = request.PhoneNumber.Trim();
            if (!System.Text.RegularExpressions.Regex.IsMatch(phoneNumber, @"^[6-9]\d{9}$"))
            {
                throw new InvalidOperationException("Enter a valid 10-digit mobile number.");
            }

            if (!string.Equals(member.PhoneNumber, phoneNumber, StringComparison.Ordinal))
            {
                member.PhoneNumber = phoneNumber;
                member.User.PhoneNumber = phoneNumber;

                // If user currently uses synthetic email/username based on old phone, update it
                if (member.User.Email != null && member.User.Email.EndsWith("@member.lexora.local", StringComparison.OrdinalIgnoreCase))
                {
                    var newSyntheticEmail = $"{phoneNumber}@member.lexora.local";
                    await _userManager.SetEmailAsync(member.User, newSyntheticEmail);
                    await _userManager.SetUserNameAsync(member.User, phoneNumber);
                }

                hasChanges = true;
            }
        }

        if (request.DateOfBirth.HasValue)
        {
            var dateOfBirth = DateOnly.FromDateTime(request.DateOfBirth.Value);
            if (member.DateOfBirth != dateOfBirth)
            {
                member.DateOfBirth = dateOfBirth;
                hasChanges = true;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Gender))
        {
            var allowedGenders = new[] { "Male", "Female", "Other" };
            var gender = allowedGenders.FirstOrDefault(x =>
                x.Equals(request.Gender.Trim(), StringComparison.OrdinalIgnoreCase));

            if (gender is null)
            {
                throw new InvalidOperationException("Invalid gender.");
            }

            if (!string.Equals(member.Gender, gender, StringComparison.Ordinal))
            {
                member.Gender = gender;
                hasChanges = true;
            }
        }

        if (request.MembershipNo is not null)
        {
            if (currentLibrary is null)
            {
                throw new InvalidOperationException("Member is not assigned to a library.");
            }

            var nextMembershipNo = await ResolveMembershipNoAsync(
                currentLibrary.LibraryId,
                request.MembershipNo,
                excludeMemberId: member.Id,
                cancellationToken);

            if (!string.Equals(member.MembershipNo, nextMembershipNo, StringComparison.OrdinalIgnoreCase))
            {
                member.MembershipNo = nextMembershipNo;
                hasChanges = true;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var isActive = request.Status.Trim().Equals("Active", StringComparison.OrdinalIgnoreCase);
            var isInactive = request.Status.Trim().Equals("Inactive", StringComparison.OrdinalIgnoreCase);

            if (!isActive && !isInactive)
            {
                throw new InvalidOperationException("Status must be Active or Inactive.");
            }

            if (member.IsActive != isActive)
            {
                member.IsActive = isActive;
                member.User.IsActive = isActive;
                hasChanges = true;
            }
        }

        if (!hasChanges)
        {
            throw new InvalidOperationException("No changes to save.");
        }

        member.UpdatedAtUtc = DateTime.UtcNow;
        member.UpdatedBy = userId;

        var identityResult = await _userManager.UpdateAsync(member.User);
        if (!identityResult.Succeeded)
        {
            throw new InvalidOperationException(string.Join(Environment.NewLine, identityResult.Errors.Select(x => x.Description)));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return (await GetMemberDetailsByIdAsync(memberId, cancellationToken))!;
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

    public async Task ChangeMemberPasswordAsync(
        Guid memberId,
        ChangeMemberPasswordRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        var callerId = await RequireCurrentUserIdAsync(cancellationToken);
        var callerIdString = callerId.ToString();
        var isSuperOrOrgAdmin = await CanChangeAccountPasswordAsync(callerId, cancellationToken);

        var member = await _dbContext.Members
            .Include(m => m.User)
            .Include(m => m.MemberLibraries.Where(ml => ml.IsCurrent))
            .FirstOrDefaultAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        var isSelf = member.UserId == callerIdString;
        if (!isSuperOrOrgAdmin && !isSelf)
        {
            throw new UnauthorizedAccessException("Only SuperAdmin, OrganisationAdmin or the member themselves can change passwords.");
        }

        if (!isSelf)
        {
            var scope = await ResolveMemberAccessScopeAsync(callerId, cancellationToken);
            var currentLibrary = member.MemberLibraries.FirstOrDefault(ml => ml.IsCurrent);
            if (!CanAccessMemberLibrary(currentLibrary?.InstitutionId, currentLibrary?.BranchId, currentLibrary?.LibraryId, scope))
            {
                throw new InvalidOperationException("Member not found.");
            }
        }

        if (member.User is null)
        {
            throw new InvalidOperationException("Member login account not found.");
        }

        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(member.User);
        var result = await _userManager.ResetPasswordAsync(member.User, resetToken, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync(
            AuditEventTypes.PasswordReset,
            member.UserId,
            isSelf ? $"Member changed their own password for {member.User.Email}" : $"Admin changed password for member {member.User.Email}",
            _currentUserService.IpAddress,
            cancellationToken);
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
            Email = entity.User?.Email?.EndsWith("@member.lexora.local", StringComparison.OrdinalIgnoreCase) == true ? null : entity.User?.Email,
            PhoneNumber = entity.PhoneNumber,
        };

    private static decimal ResolvePaidAmount(decimal? requestedPaidAmount, decimal defaultAmount)
    {
        if (!requestedPaidAmount.HasValue)
        {
            return Math.Round(Math.Max(0, defaultAmount), 2, MidpointRounding.AwayFromZero);
        }

        if (requestedPaidAmount.Value < 0)
        {
            throw new InvalidOperationException("Paid amount cannot be negative.");
        }

        return Math.Round(requestedPaidAmount.Value, 2, MidpointRounding.AwayFromZero);
    }

    private static (DateOnly Start, DateOnly End) ResolveMemberPlanDates(
        DateTime? requestedStart,
        DateTime? requestedEnd,
        int durationInDays,
        DateTime fallbackStartUtc)
    {
        var start = requestedStart.HasValue
            ? DateOnly.FromDateTime(requestedStart.Value)
            : DateOnly.FromDateTime(fallbackStartUtc);

        var duration = durationInDays > 0 ? durationInDays : 30;

        DateOnly end;
        if (requestedEnd.HasValue)
        {
            end = DateOnly.FromDateTime(requestedEnd.Value);
        }
        else
        {
            end = start.AddDays(duration);
        }

        if (end <= start)
        {
            throw new InvalidOperationException("Plan end date must be after the start date.");
        }

        return (start, end);
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
