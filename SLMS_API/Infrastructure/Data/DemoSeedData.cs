using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SLMS_API.Application.Options;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Data;

public static class DemoSeedData
{
    private sealed record DemoMemberSeed(
        int Index,
        string FullName,
        string Gender,
        string Shift,
        Guid LibraryId,
        Guid PlanId,
        int SeatNumber,
        bool HasGuardian);

    private static readonly DemoMemberSeed[] Members =
    [
        new(1, "Aarav Sharma", "Male", "Morning", DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.PlanCentralReadingMonthlyId, 1, true),
        new(2, "Priya Patel", "Female", "Evening", DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.PlanCentralReadingQuarterlyId, 2, true),
        new(3, "Rohan Mehta", "Male", "Morning", DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.PlanCentralReadingMonthlyId, 3, false),
        new(4, "Ananya Iyer", "Female", "General", DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.PlanCentralReadingMonthlyId, 4, true),
        new(5, "Kabir Singh", "Male", "Evening", DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.PlanCentralStudyMonthlyId, 1, true),
        new(6, "Sneha Reddy", "Female", "Morning", DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.PlanCentralStudyQuarterlyId, 2, true),
        new(7, "Vikram Joshi", "Male", "Night", DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.PlanCentralStudyMonthlyId, 3, false),
        new(8, "Isha Gupta", "Female", "Evening", DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.PlanCentralStudyMonthlyId, 4, true),
        new(9, "Arjun Nair", "Male", "Morning", DemoSeedIds.LibraryNorthReadingId, DemoSeedIds.PlanNorthReadingMonthlyId, 1, true),
        new(10, "Meera Desai", "Female", "General", DemoSeedIds.LibraryNorthReadingId, DemoSeedIds.PlanNorthReadingQuarterlyId, 2, true),
        new(11, "Dev Malhotra", "Male", "Evening", DemoSeedIds.LibraryNorthReadingId, DemoSeedIds.PlanNorthReadingMonthlyId, 3, false),
        new(12, "Kavya Rao", "Female", "Morning", DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.PlanNorthStudyMonthlyId, 1, true),
        new(13, "Harsh Verma", "Male", "Evening", DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.PlanNorthStudyQuarterlyId, 2, true),
        new(14, "Nisha Kapoor", "Female", "General", DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.PlanNorthStudyMonthlyId, 3, true),
        new(15, "Aditya Khan", "Male", "Night", DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.PlanNorthStudyMonthlyId, 4, false),
    ];

    private static readonly (string Title, string Author, string Category, string Isbn, int Total, int Available)[] BookCatalog =
    [
        ("The Pragmatic Programmer", "Andy Hunt", "Engineering", "9780135957059", 5, 3),
        ("Clean Code", "Robert C. Martin", "Engineering", "9780132350884", 4, 2),
        ("Atomic Habits", "James Clear", "Self-help", "9780735211292", 6, 4),
        ("Sapiens", "Yuval Noah Harari", "History", "9780062316097", 3, 1),
        ("Deep Work", "Cal Newport", "Productivity", "9781455586691", 4, 0),
        ("Introduction to Algorithms", "Cormen et al.", "Engineering", "9780262046305", 2, 2),
    ];

    public static async Task SeedAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<DemoOptions>>().Value;
        if (!options.Enabled)
        {
            return;
        }

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        if (await db.Institutions.AnyAsync(x => x.Id == DemoSeedIds.InstitutionId, cancellationToken))
        {
            await EnsureDemoAdminScopeLinksAsync(db, userManager, options, cancellationToken);
            return;
        }

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DemoSeedData");

        var memberPassword = configuration["Identity:DefaultMemberPassword"] ?? "Password@123";
        var now = DateTime.UtcNow;
        var createdBy = "demo-seed";

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var adminUser = await CreateDemoAdminAsync(userManager, roleManager, db, options, now, cancellationToken);
            createdBy = adminUser.Id;

            var institution = CreateInstitution(options, now, createdBy);
            db.Institutions.Add(institution);
            db.UserInstitutions.Add(new UserInstitution
            {
                Id = Guid.Parse("d0000008-0000-4000-8000-000000000001"),
                UserId = adminUser.Id,
                InstitutionId = institution.Id,
                IsPrimary = true,
                IsActive = true,
                AssignedAtUtc = now,
            });

            var branches = CreateBranches(now, createdBy);
            db.Branches.AddRange(branches);

            var libraries = CreateLibraries(now, createdBy);
            db.Libraries.AddRange(libraries);
            AddDemoAdminScopeLinks(db, adminUser.Id, institution.Id, branches, libraries, now, [], []);
            db.LibraryWeeklyHours.AddRange(CreateWeeklyHours(libraries, now, createdBy));
            db.LibraryHoursExceptions.Add(new LibraryHoursException
            {
                Id = Guid.Parse("d0000009-0000-4000-8000-000000000001"),
                LibraryId = DemoSeedIds.LibraryCentralReadingId,
                Name = "Republic Day holiday",
                StartDate = DateOnly.FromDateTime(now.AddDays(14)),
                EndDate = DateOnly.FromDateTime(now.AddDays(14)),
                Closed = true,
                IsActive = true,
                CreatedAtUtc = now,
                CreatedBy = createdBy,
            });

            var plans = CreatePlans(now);
            db.Plans.AddRange(plans);

            var seats = CreateSeats(libraries);
            db.Seats.AddRange(seats);

            var memberEntities = new List<Member>();
            var memberLibraryLinks = new List<MemberLibrary>();
            var memberPlans = new List<MemberPlan>();
            var guardians = new List<MemberGuardianContact>();
            var attendances = new List<MemberAttendance>();

            foreach (var seed in Members)
            {
                var library = libraries.First(x => x.Id == seed.LibraryId);
                var branch = branches.First(x => x.Id == library.BranchId);
                var plan = plans.First(x => x.Id == seed.PlanId);
                var seat = seats.First(x => x.LibraryId == seed.LibraryId && x.SeatNumber == $"A{seed.SeatNumber}");
                var email = $"demo.member{seed.Index:00}@lexora.demo";

                var memberUser = new ApplicationUser
                {
                    FullName = seed.FullName,
                    UserName = email,
                    Email = email,
                    PhoneNumber = $"+9198765{seed.Index:D5}",
                    EmailConfirmed = true,
                    OnboardingStep = OnboardingStep.Completed,
                    UserType = UserType.Member,
                    IsActive = true,
                    CreatedAtUtc = now,
                };

                var identityResult = await userManager.CreateAsync(memberUser, memberPassword);
                if (!identityResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Failed to create demo member {email}: {string.Join("; ", identityResult.Errors.Select(e => e.Description))}");
                }

                await EnsureRoleAsync(roleManager, RoleDefinitions.Members, cancellationToken);
                await userManager.AddToRoleAsync(memberUser, RoleDefinitions.Members);

                var memberId = DemoSeedIds.MemberId(seed.Index);
                var member = new Member
                {
                    Id = memberId,
                    UserId = memberUser.Id,
                    FullName = seed.FullName,
                    PhoneNumber = memberUser.PhoneNumber!,
                    MembershipNo = $"MEM-{now.Year}-{seed.Index:D4}",
                    DateOfBirth = DateOnly.FromDateTime(now.AddYears(-(18 + seed.Index))),
                    Gender = seed.Gender,
                    Shift = seed.Shift,
                    AttendanceQrToken = Guid.NewGuid().ToString("N"),
                    IsActive = true,
                    CreatedAtUtc = now,
                    CreatedBy = createdBy,
                };
                memberEntities.Add(member);

                var startDate = DateOnly.FromDateTime(now.AddDays(-10));
                memberPlans.Add(new MemberPlan
                {
                    Id = Guid.Parse($"d0000040-0000-4000-8000-{seed.Index:D12}"),
                    MemberId = memberId,
                    PlanId = plan.Id,
                    StartDate = startDate,
                    EndDate = startDate.AddDays(plan.DurationInDays),
                    Amount = plan.Price,
                    PaidAmount = plan.Price,
                    AdjustmentAmount = 0,
                    IsActive = true,
                    IsCurrent = true,
                    CreatedAtUtc = now,
                    CreatedBy = createdBy,
                });

                memberLibraryLinks.Add(new MemberLibrary
                {
                    Id = Guid.Parse($"d0000041-0000-4000-8000-{seed.Index:D12}"),
                    MemberId = memberId,
                    InstitutionId = institution.Id,
                    BranchId = branch.Id,
                    LibraryId = library.Id,
                    SeatId = seat.Id,
                    IsCurrent = true,
                    IsActive = true,
                    JoinedOn = now.AddDays(-10),
                    CreatedAtUtc = now,
                    CreatedBy = createdBy,
                });

                if (seed.HasGuardian)
                {
                    guardians.Add(new MemberGuardianContact
                    {
                        Id = Guid.Parse($"d0000042-0000-4000-8000-{seed.Index:D12}"),
                        MemberId = memberId,
                        FullName = $"{seed.FullName.Split(' ')[^1]} Guardian",
                        PhoneNumber = $"+9198000{seed.Index:D5}",
                        Email = $"guardian{seed.Index:00}@lexora.demo",
                        Relation = seed.Index % 2 == 0 ? ContactRelation.Mother : ContactRelation.Father,
                        IsGuardian = true,
                        IsEmergencyContact = true,
                        IsPrimary = true,
                        IsActive = true,
                        CreatedAtUtc = now,
                        CreatedBy = createdBy,
                    });
                }

                attendances.AddRange(CreateAttendanceHistory(
                    seed.Index,
                    memberId,
                    institution.Id,
                    branch.Id,
                    library.Id,
                    seed.Shift,
                    seed.SeatNumber,
                    now,
                    createdBy));
            }

            db.Members.AddRange(memberEntities);
            db.MemberPlans.AddRange(memberPlans);
            db.MemberLibraries.AddRange(memberLibraryLinks);
            db.MemberGuardianContacts.AddRange(guardians);
            db.MemberAttendances.AddRange(attendances);

            db.MemberTransferHistory.Add(new MemberTransferHistory
            {
                Id = Guid.Parse("d0000043-0000-4000-8000-000000000001"),
                MemberId = DemoSeedIds.MemberId(5),
                FromInstitutionId = institution.Id,
                FromBranchId = DemoSeedIds.BranchCentralId,
                FromLibraryId = DemoSeedIds.LibraryCentralReadingId,
                ToInstitutionId = institution.Id,
                ToBranchId = DemoSeedIds.BranchCentralId,
                ToLibraryId = DemoSeedIds.LibraryCentralStudyId,
                TransferDate = now.AddDays(-20),
                Reason = "Requested quieter study zone",
                TransferredByUserId = adminUser.Id,
            });

            var books = new List<Book>();
            var bookLoans = new List<BookLoan>();
            var bookAudits = new List<BookAuditEntry>();

            foreach (var library in libraries)
            {
                var branch = branches.First(x => x.Id == library.BranchId);
                for (var i = 0; i < BookCatalog.Length; i++)
                {
                    var catalog = BookCatalog[i];
                    var bookId = DemoSeedIds.BookId(library.Id, i + 1);
                    var book = new Book
                    {
                        Id = bookId,
                        InstitutionId = institution.Id,
                        BranchId = branch.Id,
                        LibraryId = library.Id,
                        Title = catalog.Title,
                        Author = catalog.Author,
                        Category = catalog.Category,
                        Isbn = $"{catalog.Isbn}-{library.Id.ToString("N")[..4]}",
                        TotalCopies = catalog.Total,
                        AvailableCopies = catalog.Available,
                        IsActive = true,
                        CreatedAtUtc = now,
                        CreatedBy = createdBy,
                    };
                    books.Add(book);
                    bookAudits.Add(new BookAuditEntry
                    {
                        Id = DemoSeedIds.BookAuditId(library.Id, i + 1),
                        BookId = bookId,
                        Type = BookAuditType.Added,
                        Note = book.Title,
                        ActorUserId = adminUser.Id,
                        ActorName = options.AdminEmail,
                        CreatedAtUtc = now,
                        CreatedBy = createdBy,
                    });
                }
            }

            db.Books.AddRange(books);
            db.BookAuditEntries.AddRange(bookAudits);

            var loanMembers = memberEntities.Take(6).ToList();
            var loanBooks = books.Where(b => b.AvailableCopies == 0 || b.Title is "Deep Work" or "Sapiens" or "Clean Code").Take(5).ToList();
            for (var i = 0; i < loanBooks.Count; i++)
            {
                var book = loanBooks[i];
                var member = loanMembers[i % loanMembers.Count];
                var checkedOut = now.AddDays(-(5 + i * 3));
                var due = checkedOut.AddDays(14);
                var isOverdue = i < 2;
                var status = isOverdue ? BookLoanStatus.Overdue : BookLoanStatus.Active;
                bookLoans.Add(new BookLoan
                {
                    Id = Guid.Parse($"d0000051-0000-4000-8000-{(i + 1):D12}"),
                    BookId = book.Id,
                    MemberId = member.Id,
                    LibraryId = book.LibraryId,
                    MemberName = member.FullName,
                    Status = status,
                    LoanDays = 14,
                    CheckedOutAtUtc = checkedOut,
                    DueAtUtc = isOverdue ? now.AddDays(-2) : due,
                    OverdueDays = isOverdue ? 2 : null,
                    FineAmount = isOverdue ? 20m : null,
                    IsActive = true,
                    CreatedAtUtc = checkedOut,
                    CreatedBy = createdBy,
                });
            }

            db.BookLoans.AddRange(bookLoans);

            db.SupportTickets.AddRange(CreateSupportTickets(adminUser, options, now, createdBy));
            db.SupportTicketMessages.AddRange(CreateSupportMessages(adminUser, options, now, createdBy));

            var incident = new SystemIncident
            {
                Id = DemoSeedIds.SystemIncidentId,
                Title = "Scheduled maintenance — attendance sync",
                Severity = "minor",
                Status = "Resolved",
                AffectedComponents = "[\"Attendance\",\"Notifications\"]",
                StartedAtUtc = now.AddDays(-3),
                ResolvedAtUtc = now.AddDays(-3).AddHours(2),
                IsActive = true,
                CreatedAtUtc = now.AddDays(-3),
                CreatedBy = createdBy,
                Updates =
                [
                    new SystemIncidentUpdate
                    {
                        Id = Guid.Parse("d0000052-0000-4000-8000-000000000001"),
                        Phase = "Resolved",
                        Body = "Maintenance completed. All attendance kiosks are syncing normally.",
                        OccurredAtUtc = now.AddDays(-3).AddHours(2),
                        IsActive = true,
                        CreatedAtUtc = now.AddDays(-3),
                        CreatedBy = createdBy,
                    },
                ],
            };
            db.SystemIncidents.Add(incident);

            db.UserNotifications.AddRange(
            [
                new UserNotification
                {
                    Id = Guid.Parse("d0000053-0000-4000-8000-000000000001"),
                    UserId = adminUser.Id,
                    Title = "Welcome to Lexora Demo",
                    Message = "Your demo institute is ready with branches, libraries, members, books, and attendance data.",
                    NotificationType = "System",
                    IsRead = false,
                    IsActive = true,
                    CreatedAtUtc = now,
                    CreatedBy = createdBy,
                },
                new UserNotification
                {
                    Id = Guid.Parse("d0000053-0000-4000-8000-000000000002"),
                    UserId = adminUser.Id,
                    Title = "2 overdue book loans",
                    Message = "Deep Work and Sapiens have overdue returns in Central Reading Hall.",
                    NotificationType = "Books",
                    IsRead = false,
                    IsActive = true,
                    CreatedAtUtc = now.AddHours(-2),
                    CreatedBy = createdBy,
                },
            ]);

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            logger.LogInformation(
                "Demo data seeded. Login with {Email} / {Password}",
                options.AdminEmail,
                options.AdminPassword);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static async Task<ApplicationUser> CreateDemoAdminAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationDbContext db,
        DemoOptions options,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var existing = await userManager.FindByEmailAsync(options.AdminEmail);
        if (existing is not null)
        {
            await EnsureRoleAsync(roleManager, RoleDefinitions.OrganisationAdmin, cancellationToken);
            if (!await userManager.IsInRoleAsync(existing, RoleDefinitions.OrganisationAdmin))
            {
                await userManager.AddToRoleAsync(existing, RoleDefinitions.OrganisationAdmin);
            }

            if (!await db.UserPackages.AnyAsync(x => x.UserId == existing.Id && x.IsCurrentPackage, cancellationToken))
            {
                await EnsureUserPackageAsync(db, existing.Id, now, cancellationToken);
            }

            return existing;
        }

        var adminUser = new ApplicationUser
        {
            FullName = "Demo Organisation Admin",
            UserName = options.AdminEmail,
            Email = options.AdminEmail,
            PhoneNumber = "+919999988877",
            EmailConfirmed = true,
            OnboardingStep = OnboardingStep.Completed,
            UserType = UserType.OrganizationOwner,
            IsActive = true,
            CreatedAtUtc = now,
        };

        var result = await userManager.CreateAsync(adminUser, options.AdminPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to create demo admin: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        }

        await EnsureRoleAsync(roleManager, RoleDefinitions.OrganisationAdmin, cancellationToken);
        await userManager.AddToRoleAsync(adminUser, RoleDefinitions.OrganisationAdmin);
        await EnsureUserPackageAsync(db, adminUser.Id, now, cancellationToken);

        return adminUser;
    }

    private static async Task EnsureUserPackageAsync(
        ApplicationDbContext db,
        string userId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var packageExists = await db.Packages.AnyAsync(x => x.Id == DemoSeedIds.TrialPackageId, cancellationToken);
        if (!packageExists)
        {
            return;
        }

        db.UserPackages.Add(new UserPackage
        {
            Id = Guid.Parse("d0000054-0000-4000-8000-000000000001"),
            UserId = userId,
            PackageId = DemoSeedIds.TrialPackageId,
            StartDateUtc = now,
            EndDateUtc = now.AddDays(365),
            AmountPaid = 0,
            AdjustmentAmount = 0,
            AutoRenew = false,
            IsActive = true,
            IsCurrentPackage = true,
            PaymentStatus = "Paid",
            PaymentMethod = "Demo",
            CreatedAtUtc = now,
        });
    }

    private static Institution CreateInstitution(DemoOptions options, DateTime now, string createdBy) =>
        new()
        {
            Id = DemoSeedIds.InstitutionId,
            Name = options.InstitutionName,
            Description = "Fully populated demo institute for exploring all SLMS features.",
            Type = "Coaching Institute",
            Email = "contact@lexora.demo",
            Phone = "+912223344556",
            WebsiteUrl = "https://lexora.demo",
            LogoUrl = "https://ui-avatars.com/api/?name=Lexora+Demo&background=2563eb&color=fff&size=128",
            Address = "123 Knowledge Park, Baner Road",
            City = "Pune",
            State = "Maharashtra",
            PostalCode = "411045",
            Country = "India",
            TimeZone = "Asia/Kolkata",
            Status = InstitutionStatus.Active,
            IsActive = true,
            CreatedAtUtc = now,
            CreatedBy = createdBy,
        };

    private static Branch[] CreateBranches(DateTime now, string createdBy) =>
    [
        new()
        {
            Id = DemoSeedIds.BranchCentralId,
            InstitutionId = DemoSeedIds.InstitutionId,
            Name = "Central Campus",
            Description = "Main campus with reading hall and study zones.",
            Email = "central@lexora.demo",
            Phone = "+912223344557",
            Address = "Baner, Pune",
            City = "Pune",
            Capacity = 120,
            OperatingHoursStart = new TimeOnly(6, 0),
            OperatingHoursEnd = new TimeOnly(22, 0),
            Status = InstitutionStatus.Active,
            IsActive = true,
            CreatedAtUtc = now,
            CreatedBy = createdBy,
        },
        new()
        {
            Id = DemoSeedIds.BranchNorthId,
            InstitutionId = DemoSeedIds.InstitutionId,
            Name = "North Campus",
            Description = "Secondary campus for evening and weekend batches.",
            Email = "north@lexora.demo",
            Phone = "+912223344558",
            Address = "Hinjawadi, Pune",
            City = "Pune",
            Capacity = 80,
            OperatingHoursStart = new TimeOnly(7, 0),
            OperatingHoursEnd = new TimeOnly(21, 0),
            Status = InstitutionStatus.Active,
            IsActive = true,
            CreatedAtUtc = now,
            CreatedBy = createdBy,
        },
    ];

    private static Library[] CreateLibraries(DateTime now, string createdBy) =>
    [
        CreateLibrary(DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.BranchCentralId, "Central Reading Hall", "Ground floor silent reading area", 60, "lib-central-reading", now, createdBy),
        CreateLibrary(DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.BranchCentralId, "Central Study Zone", "Air-conditioned group study space", 45, "lib-central-study", now, createdBy),
        CreateLibrary(DemoSeedIds.LibraryNorthReadingId, DemoSeedIds.BranchNorthId, "North Reading Hall", "Evening batch reading hall", 40, "lib-north-reading", now, createdBy),
        CreateLibrary(DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.BranchNorthId, "North Study Zone", "Weekend intensive study room", 35, "lib-north-study", now, createdBy),
    ];

    private static Library CreateLibrary(
        Guid id,
        Guid branchId,
        string name,
        string description,
        int capacity,
        string qrToken,
        DateTime now,
        string createdBy) =>
        new()
        {
            Id = id,
            InstitutionId = DemoSeedIds.InstitutionId,
            BranchId = branchId,
            Name = name,
            Description = description,
            Email = $"{name.Replace(' ', '.').ToLowerInvariant()}@lexora.demo",
            Phone = "+912223344559",
            Address = "Pune, Maharashtra",
            Floor = 1,
            Capacity = capacity,
            DefaultLoanDays = 14,
            OverdueFinePerDay = 10m,
            AttendanceQrToken = qrToken,
            Status = InstitutionStatus.Active,
            IsActive = true,
            CreatedAtUtc = now,
            CreatedBy = createdBy,
        };

    private static readonly string[] WeekdayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    private static IEnumerable<LibraryWeeklyHour> CreateWeeklyHours(IEnumerable<Library> libraries, DateTime now, string createdBy)
    {
        var index = 0;
        foreach (var library in libraries)
        {
            foreach (var day in WeekdayKeys)
            {
                var closed = day is "sun";
                index++;
                yield return new LibraryWeeklyHour
                {
                    Id = Guid.Parse($"d0000055-0000-4000-8000-{index:D12}"),
                    LibraryId = library.Id,
                    Day = day,
                    Closed = closed,
                    OpenTime = closed ? null : new TimeOnly(6, 0),
                    CloseTime = closed ? null : new TimeOnly(22, 0),
                    IsActive = true,
                    CreatedAtUtc = now,
                    CreatedBy = createdBy,
                };
            }
        }
    }

    private static Plan[] CreatePlans(DateTime now) =>
    [
        CreatePlan(DemoSeedIds.PlanCentralReadingMonthlyId, DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.BranchCentralId, "Monthly Plan", 1500m, 30, now),
        CreatePlan(DemoSeedIds.PlanCentralReadingQuarterlyId, DemoSeedIds.LibraryCentralReadingId, DemoSeedIds.BranchCentralId, "Quarterly Plan", 4000m, 90, now),
        CreatePlan(DemoSeedIds.PlanCentralStudyMonthlyId, DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.BranchCentralId, "Monthly Plan", 1800m, 30, now),
        CreatePlan(DemoSeedIds.PlanCentralStudyQuarterlyId, DemoSeedIds.LibraryCentralStudyId, DemoSeedIds.BranchCentralId, "Quarterly Plan", 4800m, 90, now),
        CreatePlan(DemoSeedIds.PlanNorthReadingMonthlyId, DemoSeedIds.LibraryNorthReadingId, DemoSeedIds.BranchNorthId, "Monthly Plan", 1400m, 30, now),
        CreatePlan(DemoSeedIds.PlanNorthReadingQuarterlyId, DemoSeedIds.LibraryNorthReadingId, DemoSeedIds.BranchNorthId, "Quarterly Plan", 3800m, 90, now),
        CreatePlan(DemoSeedIds.PlanNorthStudyMonthlyId, DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.BranchNorthId, "Monthly Plan", 1600m, 30, now),
        CreatePlan(DemoSeedIds.PlanNorthStudyQuarterlyId, DemoSeedIds.LibraryNorthStudyId, DemoSeedIds.BranchNorthId, "Quarterly Plan", 4200m, 90, now),
    ];

    private static Plan CreatePlan(Guid id, Guid libraryId, Guid branchId, string name, decimal price, int days, DateTime now) =>
        new()
        {
            Id = id,
            InstitutionId = DemoSeedIds.InstitutionId,
            BranchId = branchId,
            LibraryId = libraryId,
            Name = name,
            Description = $"{name} for demo library members.",
            Price = price,
            DurationInDays = days,
            MaxSeats = 50,
            IsActive = true,
            CreatedAtUtc = now,
        };

    private static List<Seat> CreateSeats(IEnumerable<Library> libraries)
    {
        var seats = new List<Seat>();
        foreach (var library in libraries)
        {
            for (var i = 1; i <= 12; i++)
            {
                seats.Add(new Seat
                {
                    Id = DemoSeedIds.SeatId(library.Id, i),
                    LibraryId = library.Id,
                    SeatNumber = $"A{i}",
                    IsActive = true,
                });
            }
        }

        return seats;
    }

    private static IEnumerable<MemberAttendance> CreateAttendanceHistory(
        int memberIndex,
        Guid memberId,
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        string shift,
        int seatNumber,
        DateTime now,
        string createdBy)
    {
        var checkInHour = shift switch
        {
            "Morning" => 7,
            "Evening" => 16,
            "Night" => 20,
            _ => 10,
        };

        for (var dayOffset = 1; dayOffset <= 10; dayOffset++)
        {
            var date = DateOnly.FromDateTime(now.AddDays(-dayOffset));
            if (date.DayOfWeek is DayOfWeek.Sunday)
            {
                continue;
            }

            var checkIn = new TimeOnly(checkInHour, 5 + dayOffset % 10);
            var checkOut = checkIn.AddHours(4);
            yield return new MemberAttendance
            {
                Id = DemoSeedIds.AttendanceId(memberIndex, dayOffset),
                MemberId = memberId,
                AttendanceDate = date,
                CheckInTime = checkIn,
                CheckOutTime = checkOut,
                DurationMinutes = 240,
                Status = dayOffset == 3 ? AttendanceStatus.Late : AttendanceStatus.Present,
                InstitutionId = institutionId,
                BranchId = branchId,
                LibraryId = libraryId,
                Source = dayOffset % 2 == 0 ? AttendanceSource.QRCode : AttendanceSource.Manual,
                SeatNo = $"A{seatNumber}",
                DeviceId = dayOffset % 2 == 0 ? "demo-kiosk-01" : null,
                IsActive = true,
                CreatedAtUtc = now.AddDays(-dayOffset),
                CreatedBy = createdBy,
            };
        }
    }

    private static IEnumerable<SupportTicket> CreateSupportTickets(ApplicationUser adminUser, DemoOptions options, DateTime now, string createdBy) =>
    [
        new()
        {
            Id = DemoSeedIds.SupportTicketOpenId,
            Subject = "Need help configuring WhatsApp alerts",
            Category = TicketCategory.Technical,
            Priority = TicketPriority.Normal,
            Status = TicketStatus.Open,
            Area = "Notifications",
            RequesterUserId = adminUser.Id,
            RequesterName = adminUser.FullName ?? "Demo Admin",
            RequesterEmail = options.AdminEmail,
            OwnerUserId = adminUser.Id,
            OwnerName = "Support Team",
            Channel = "Portal",
            Tags = "notifications,whatsapp",
            SlaDueAtUtc = now.AddDays(2),
            IsActive = true,
            CreatedAtUtc = now.AddDays(-1),
            CreatedBy = createdBy,
        },
        new()
        {
            Id = DemoSeedIds.SupportTicketResolvedId,
            Subject = "Bulk member import completed",
            Category = TicketCategory.FeatureRequest,
            Priority = TicketPriority.Low,
            Status = TicketStatus.Resolved,
            Area = "Members",
            RequesterUserId = adminUser.Id,
            RequesterName = adminUser.FullName ?? "Demo Admin",
            RequesterEmail = options.AdminEmail,
            Channel = "Email",
            Tags = "import,members",
            IsActive = true,
            CreatedAtUtc = now.AddDays(-5),
            CreatedBy = createdBy,
        },
    ];

    private static IEnumerable<SupportTicketMessage> CreateSupportMessages(
        ApplicationUser adminUser,
        DemoOptions options,
        DateTime now,
        string createdBy) =>
    [
        new()
        {
            Id = Guid.Parse("d0000061-0000-4000-8000-000000000001"),
            TicketId = DemoSeedIds.SupportTicketOpenId,
            AuthorUserId = adminUser.Id,
            AuthorName = adminUser.FullName ?? "Demo Admin",
            AuthorRole = "OrganisationAdmin",
            Body = "We want to send fee reminders on WhatsApp for overdue members.",
            IsActive = true,
            CreatedAtUtc = now.AddDays(-1),
            CreatedBy = createdBy,
        },
        new()
        {
            Id = Guid.Parse("d0000061-0000-4000-8000-000000000002"),
            TicketId = DemoSeedIds.SupportTicketOpenId,
            AuthorUserId = adminUser.Id,
            AuthorName = "Support Team",
            AuthorRole = "Support",
            Body = "Please share your WhatsApp Business API credentials under Settings → Notifications.",
            IsActive = true,
            CreatedAtUtc = now.AddHours(-6),
            CreatedBy = createdBy,
        },
        new()
        {
            Id = Guid.Parse("d0000061-0000-4000-8000-000000000003"),
            TicketId = DemoSeedIds.SupportTicketResolvedId,
            AuthorUserId = adminUser.Id,
            AuthorName = adminUser.FullName ?? "Demo Admin",
            AuthorRole = "OrganisationAdmin",
            Body = "CSV import for 15 demo members worked perfectly. Thanks!",
            IsActive = true,
            CreatedAtUtc = now.AddDays(-5),
            CreatedBy = createdBy,
        },
    ];

    private static async Task EnsureDemoAdminScopeLinksAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        DemoOptions options,
        CancellationToken cancellationToken)
    {
        var adminUser = await userManager.FindByEmailAsync(options.AdminEmail);
        if (adminUser is null)
        {
            return;
        }

        var branches = await db.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == DemoSeedIds.InstitutionId && !x.IsDeleted)
            .ToListAsync(cancellationToken);

        var libraries = await db.Libraries
            .AsNoTracking()
            .Where(x => x.InstitutionId == DemoSeedIds.InstitutionId && !x.IsDeleted)
            .ToListAsync(cancellationToken);

        if (branches.Count == 0 || libraries.Count == 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var hasInstitutionLink = await db.UserInstitutions.AnyAsync(
            x => x.UserId == adminUser.Id && x.InstitutionId == DemoSeedIds.InstitutionId && x.IsActive,
            cancellationToken);

        if (!hasInstitutionLink)
        {
            db.UserInstitutions.Add(new UserInstitution
            {
                Id = Guid.Parse("d0000008-0000-4000-8000-000000000001"),
                UserId = adminUser.Id,
                InstitutionId = DemoSeedIds.InstitutionId,
                IsPrimary = true,
                IsActive = true,
                AssignedAtUtc = now,
            });
        }

        var existingBranchIds = await db.UserBranches
            .AsNoTracking()
            .Where(x => x.UserId == adminUser.Id && x.IsActive)
            .Select(x => x.BranchId)
            .ToListAsync(cancellationToken);

        var existingLibraryIds = await db.UserLibraries
            .AsNoTracking()
            .Where(x => x.UserId == adminUser.Id && x.IsActive)
            .Select(x => x.LibraryId)
            .ToListAsync(cancellationToken);

        AddDemoAdminScopeLinks(
            db,
            adminUser.Id,
            DemoSeedIds.InstitutionId,
            branches,
            libraries,
            now,
            existingBranchIds,
            existingLibraryIds);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static void AddDemoAdminScopeLinks(
        ApplicationDbContext db,
        string adminUserId,
        Guid institutionId,
        IEnumerable<Branch> branches,
        IEnumerable<Library> libraries,
        DateTime now,
        IReadOnlyCollection<Guid> existingBranchIds,
        IReadOnlyCollection<Guid> existingLibraryIds)
    {
        var branchIndex = 0;
        foreach (var branch in branches.OrderBy(x => x.Id))
        {
            branchIndex++;
            if (existingBranchIds.Contains(branch.Id))
            {
                continue;
            }

            db.UserBranches.Add(new UserBranch
            {
                Id = Guid.Parse($"d0000056-0000-4000-8000-{branchIndex:D12}"),
                UserId = adminUserId,
                InstitutionId = institutionId,
                BranchId = branch.Id,
                IsPrimary = branchIndex == 1,
                IsActive = true,
                AssignedAtUtc = now,
            });
        }

        var libraryIndex = 0;
        foreach (var library in libraries.OrderBy(x => x.Id))
        {
            libraryIndex++;
            if (existingLibraryIds.Contains(library.Id))
            {
                continue;
            }

            db.UserLibraries.Add(new UserLibrary
            {
                Id = Guid.Parse($"d0000057-0000-4000-8000-{libraryIndex:D12}"),
                UserId = adminUserId,
                InstitutionId = institutionId,
                BranchId = library.BranchId,
                LibraryId = library.Id,
                IsPrimary = libraryIndex == 1,
                IsActive = true,
                AssignedAtUtc = now,
            });
        }
    }

    private static async Task EnsureRoleAsync(RoleManager<IdentityRole> roleManager, string roleName, CancellationToken cancellationToken)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            await roleManager.CreateAsync(new IdentityRole(roleName));
        }
    }
}
