using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Dashboard;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _db;
    private readonly ILibraryService _libraryService;
    private readonly INotificationService _notificationService;
    private readonly UserManager<ApplicationUser> _userManager;

    public DashboardService(
        ApplicationDbContext db,
        ILibraryService libraryService,
        INotificationService notificationService,
        UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _libraryService = libraryService;
        _notificationService = notificationService;
        _userManager = userManager;
    }

    public Task<DashboardOverviewResponse> GetOverviewAsync(
        DashboardQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
        => BuildOverviewAsync(query, userId, cancellationToken);

    public async Task<DashboardRevenueResponse> GetRevenueAsync(
        DashboardQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var scope = await ResolveScopeAsync(query, userId, cancellationToken);
        var days = NormalizeDays(query.Days);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dateFrom = today.AddDays(-(days - 1));
        var rangeStartUtc = dateFrom.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var planRows = await LoadScopedPlanRowsAsync(scope.LibraryIds, cancellationToken);
        var rangeRows = planRows.Where(x => x.CreatedAtUtc >= rangeStartUtc).ToList();
        var trend = BuildRevenueTrend(dateFrom, today, rangeRows);
        var totalRevenue = rangeRows.Sum(x => x.PaidAmount);
        var totalRenewals = rangeRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount);

        var transactions = rangeRows
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(20)
            .Select(x => new DashboardPaymentTransactionResponse
            {
                Id = x.PlanId,
                MemberName = x.MemberName,
                PlanName = x.PlanName,
                Amount = x.Amount,
                PaidAmount = x.PaidAmount,
                PaymentStatus = x.PaymentStatus,
                CreatedAtUtc = x.CreatedAtUtc,
            })
            .ToList();

        var paidCount = rangeRows.Count(x => x.PaidAmount >= x.Amount && x.Amount > 0);
        var pendingCount = rangeRows.Count(x => x.PaidAmount < x.Amount);

        return new DashboardRevenueResponse
        {
            IsSuperAdmin = scope.IsSuperAdmin,
            Days = days,
            Trend = trend,
            RecentTransactions = transactions,
            Kpis = new DashboardRevenueKpiResponse
            {
                TotalRevenue = totalRevenue,
                TotalRenewals = totalRenewals,
                AvgDailyRevenue = days > 0 ? Math.Round(totalRevenue / days, 2) : 0,
                PaidCount = paidCount,
                PendingCount = pendingCount,
            },
        };
    }

    private async Task<DashboardOverviewResponse> BuildOverviewAsync(
        DashboardQuery query,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(query, userId, cancellationToken);
        var days = NormalizeDays(query.Days);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dateFrom = today.AddDays(-(days - 1));
        var attendanceFrom = today.AddDays(-Math.Min(days, 14) + 1);
        var nowUtc = DateTime.UtcNow;
        var rangeStartUtc = dateFrom.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var userIdString = userId.ToString();

        var libraryIds = scope.LibraryIds;
        var branchIds = scope.BranchIds;

        var memberRows = await (
            from ml in _db.MemberLibraries.AsNoTracking()
            join m in _db.Members.AsNoTracking() on ml.MemberId equals m.Id
            where !ml.IsDeleted && ml.IsCurrent && libraryIds.Contains(ml.LibraryId) && !m.IsDeleted
            select new
            {
                m.Id,
                m.IsActive,
                PlanEndDate = m.MemberPlans
                    .Where(mp => mp.IsCurrent && mp.IsActive && !mp.IsDeleted)
                    .Select(mp => (DateOnly?)mp.EndDate)
                    .FirstOrDefault(),
                PlanAmount = m.MemberPlans
                    .Where(mp => mp.IsCurrent && mp.IsActive && !mp.IsDeleted)
                    .Select(mp => (decimal?)mp.Amount)
                    .FirstOrDefault(),
                PaidAmount = m.MemberPlans
                    .Where(mp => mp.IsCurrent && mp.IsActive && !mp.IsDeleted)
                    .Select(mp => (decimal?)mp.PaidAmount)
                    .FirstOrDefault(),
            })
            .Distinct()
            .ToListAsync(cancellationToken);

        var activeMembers = 0;
        var inactiveMembers = 0;
        var suspendedMembers = 0;
        decimal totalFeesOwed = 0;

        foreach (var member in memberRows)
        {
            if (!member.IsActive)
            {
                inactiveMembers++;
                continue;
            }

            if (member.PlanEndDate is null)
            {
                suspendedMembers++;
                continue;
            }

            if (member.PlanEndDate.Value >= today)
            {
                activeMembers++;
            }
            else
            {
                suspendedMembers++;
            }

            if (member.PlanAmount is > 0 && member.PaidAmount is not null)
            {
                totalFeesOwed += Math.Max(0, member.PlanAmount.Value - member.PaidAmount.Value);
            }
        }

        var memberCountsByLibrary = await InstitutionStatsHelper.GetLibraryMemberCountsAsync(
            _db, libraryIds, cancellationToken);
        var totalEnrolled = memberCountsByLibrary.Values.Sum();

        var totalCapacity = libraryIds.Count == 0
            ? 0
            : await _db.Libraries.AsNoTracking()
                .Where(l => libraryIds.Contains(l.Id) && !l.IsDeleted && l.IsActive)
                .SumAsync(l => l.Capacity ?? 0, cancellationToken);

        var occupancyPercent = totalCapacity > 0
            ? Math.Round((decimal)totalEnrolled / totalCapacity * 100m, 1)
            : 0m;

        var planRows = await LoadScopedPlanRowsAsync(libraryIds, cancellationToken);
        var revenueMetrics = InstitutionRevenueHelper.AggregateByLibrary(
            planRows.Select(x => (x.LibraryId, x.PaidAmount, x.CreatedAtUtc)),
            nowUtc);
        var revenueMtd = revenueMetrics.Values.Sum(x => x.Mtd);
        var previousMtd = revenueMetrics.Values.Sum(x => x.PreviousMtd);
        var revenueMtdDelta = previousMtd > 0
            ? Math.Round((double)((revenueMtd - previousMtd) / previousMtd * 100m), 1)
            : 0d;

        var branches = branchIds.Count == 0
            ? []
            : await _db.Branches.AsNoTracking()
                .Where(b => branchIds.Contains(b.Id) && !b.IsDeleted)
                .Select(b => new { b.Id, b.Name, b.City, b.Status, b.IsActive })
                .ToListAsync(cancellationToken);

        var branchesLive = branches.Count(b => b.IsActive && b.Status == InstitutionStatus.Active);
        var branchesMaintenance = branches.Count(b =>
            b.Status == InstitutionStatus.Maintenance ||
            b.Status == InstitutionStatus.Suspended ||
            b.Status == InstitutionStatus.Pending);

        var branchStats = await InstitutionStatsHelper.GetBranchStatsAsync(_db, branchIds, cancellationToken);
        var revenueByBranch = InstitutionRevenueHelper.AggregateByBranch(
            planRows.Select(x => (x.BranchId, x.PaidAmount, x.CreatedAtUtc)),
            nowUtc);

        var branchPerformance = branches
            .Select(b =>
            {
                branchStats.TryGetValue(b.Id, out var stats);
                revenueByBranch.TryGetValue(b.Id, out var revenue);
                return new DashboardBranchPerformanceResponse
                {
                    BranchId = b.Id,
                    BranchName = b.Name,
                    City = b.City,
                    Members = stats?.MemberCount ?? 0,
                    OccupancyPercent = stats?.OccupancyPercent ?? 0,
                    RevenueMtd = revenue?.Mtd ?? 0,
                };
            })
            .OrderByDescending(x => x.OccupancyPercent)
            .Take(6)
            .ToList();

        var rangePlanRows = planRows.Where(x => x.CreatedAtUtc >= rangeStartUtc).ToList();
        var revenueTrend = BuildRevenueTrend(dateFrom, today, rangePlanRows);
        var attendanceTrend = await BuildAttendanceTrendAsync(libraryIds, attendanceFrom, today, totalCapacity, cancellationToken);

        var recentActivity = await BuildRecentActivityAsync(libraryIds, cancellationToken);
        var notifications = await LoadNotificationsAsync(userIdString, cancellationToken);

        return new DashboardOverviewResponse
        {
            IsSuperAdmin = scope.IsSuperAdmin,
            ScopeLabel = scope.ScopeLabel,
            Days = days,
            Kpis = new DashboardKpiResponse
            {
                ActiveMembers = activeMembers,
                ActiveMembersDelta = 0,
                OccupancyPercent = occupancyPercent,
                OccupancyDelta = 0,
                RevenueMtd = revenueMtd,
                RevenueMtdDelta = revenueMtdDelta,
                BranchesLive = branchesLive,
                BranchesMaintenance = branchesMaintenance,
                TotalFeesOwed = totalFeesOwed,
                AccessibleLibraries = libraryIds.Count,
            },
            RevenueTrend = revenueTrend,
            AttendanceTrend = attendanceTrend,
            MemberMix = new DashboardMemberMixResponse
            {
                Total = memberRows.Count,
                Active = activeMembers,
                Inactive = inactiveMembers,
                Suspended = suspendedMembers,
                TotalFeesOwed = totalFeesOwed,
            },
            BranchPerformance = branchPerformance,
            RecentActivity = recentActivity,
            Notifications = notifications,
        };
    }

    private async Task<DashboardScope> ResolveScopeAsync(
        DashboardQuery query,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var isSuperAdmin = await IsSuperAdminAsync(userId, cancellationToken);
        var userIdString = userId.ToString();

        IReadOnlyCollection<Guid> libraryIds;
        if (isSuperAdmin)
        {
            libraryIds = await _db.Libraries.AsNoTracking()
                .Where(l => !l.IsDeleted)
                .Select(l => l.Id)
                .ToListAsync(cancellationToken);
        }
        else
        {
            libraryIds = (await _libraryService.GetAccessibleLibraryIdsAsync(userId, cancellationToken)).ToList();
        }

        if (query.LibraryId.HasValue)
        {
            libraryIds = libraryIds.Contains(query.LibraryId.Value)
                ? [query.LibraryId.Value]
                : [];
        }
        else if (query.BranchId.HasValue)
        {
            libraryIds = await _db.Libraries.AsNoTracking()
                .Where(l => !l.IsDeleted && l.BranchId == query.BranchId.Value && libraryIds.Contains(l.Id))
                .Select(l => l.Id)
                .ToListAsync(cancellationToken);
        }
        else if (query.InstitutionId.HasValue)
        {
            libraryIds = await _db.Libraries.AsNoTracking()
                .Where(l => !l.IsDeleted && l.InstitutionId == query.InstitutionId.Value && libraryIds.Contains(l.Id))
                .Select(l => l.Id)
                .ToListAsync(cancellationToken);
        }

        var branchIds = libraryIds.Count == 0
            ? []
            : await _db.Libraries.AsNoTracking()
                .Where(l => libraryIds.Contains(l.Id))
                .Select(l => l.BranchId)
                .Distinct()
                .ToListAsync(cancellationToken);

        var scopeLabel = isSuperAdmin
            ? "All institutions · SuperAdmin"
            : $"Your workspace · {libraryIds.Count} libraries";

        return new DashboardScope(isSuperAdmin, libraryIds, branchIds, scopeLabel);
    }

    private async Task<List<ScopedPlanRow>> LoadScopedPlanRowsAsync(
        IReadOnlyCollection<Guid> libraryIds,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return [];
        }

        var rows = await (
            from mp in _db.MemberPlans.AsNoTracking()
            join m in _db.Members.AsNoTracking() on mp.MemberId equals m.Id
            join ml in _db.MemberLibraries.AsNoTracking() on m.Id equals ml.MemberId
            join p in _db.Plans.AsNoTracking() on mp.PlanId equals p.Id
            where !mp.IsDeleted && !m.IsDeleted && !ml.IsDeleted && ml.IsCurrent && libraryIds.Contains(ml.LibraryId)
            select new
            {
                mp.Id,
                mp.MemberId,
                MemberName = m.FullName,
                PlanName = p.Name,
                ml.BranchId,
                ml.LibraryId,
                mp.Amount,
                mp.PaidAmount,
                mp.CreatedAtUtc,
                mp.IsCurrent,
                PriorPlanCount = m.MemberPlans.Count(x => !x.IsDeleted && x.CreatedAtUtc < mp.CreatedAtUtc),
            })
            .ToListAsync(cancellationToken);

        return rows.Select(x => new ScopedPlanRow
        {
            PlanId = x.Id,
            MemberId = x.MemberId,
            MemberName = x.MemberName,
            PlanName = x.PlanName,
            BranchId = x.BranchId,
            LibraryId = x.LibraryId,
            Amount = x.Amount,
            PaidAmount = x.PaidAmount,
            CreatedAtUtc = x.CreatedAtUtc,
            IsRenewal = x.PriorPlanCount > 0,
            PaymentStatus = x.PaidAmount >= x.Amount && x.Amount > 0 ? "Paid" : x.PaidAmount > 0 ? "Partial" : "Pending",
        }).ToList();
    }

    private static List<DashboardTrendPointResponse> BuildRevenueTrend(
        DateOnly dateFrom,
        DateOnly dateTo,
        IReadOnlyCollection<ScopedPlanRow> rows)
    {
        var trend = new List<DashboardTrendPointResponse>();
        for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
        {
            var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayEnd = date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayRows = rows.Where(x => x.CreatedAtUtc >= dayStart && x.CreatedAtUtc < dayEnd).ToList();
            trend.Add(new DashboardTrendPointResponse
            {
                Date = date.ToString("yyyy-MM-dd"),
                Revenue = dayRows.Sum(x => x.PaidAmount),
                Renewals = dayRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount),
            });
        }

        return trend;
    }

    private async Task<List<DashboardAttendanceTrendPointResponse>> BuildAttendanceTrendAsync(
        IReadOnlyCollection<Guid> libraryIds,
        DateOnly dateFrom,
        DateOnly dateTo,
        int totalCapacity,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return [];
        }

        var attendanceRows = await _db.MemberAttendances.AsNoTracking()
            .Where(x => !x.IsDeleted && libraryIds.Contains(x.LibraryId) && x.AttendanceDate >= dateFrom && x.AttendanceDate <= dateTo)
            .Select(x => new { x.AttendanceDate, x.MemberId, x.Status, x.CheckInTime })
            .ToListAsync(cancellationToken);

        var trend = new List<DashboardAttendanceTrendPointResponse>();
        for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
        {
            var dayRows = attendanceRows.Where(x => x.AttendanceDate == date).ToList();
            var present = dayRows.Where(x => x.CheckInTime.HasValue).Select(x => x.MemberId).Distinct().Count();
            var late = dayRows.Count(x => x.Status == AttendanceStatus.Late);
            var absent = Math.Max(0, totalCapacity - present);
            trend.Add(new DashboardAttendanceTrendPointResponse
            {
                Date = date.ToString("yyyy-MM-dd"),
                Present = present,
                Late = late,
                Absent = absent,
            });
        }

        return trend;
    }

    private async Task<List<DashboardActivityItemResponse>> BuildRecentActivityAsync(
        IReadOnlyCollection<Guid> libraryIds,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return [];
        }

        var rows = await (
            from a in _db.MemberAttendances.AsNoTracking()
            join m in _db.Members.AsNoTracking() on a.MemberId equals m.Id
            join l in _db.Libraries.AsNoTracking() on a.LibraryId equals l.Id
            where !a.IsDeleted && libraryIds.Contains(a.LibraryId) && a.CheckInTime.HasValue
            orderby a.UpdatedAtUtc descending, a.CreatedAtUtc descending
            select new
            {
                a.Id,
                MemberName = m.FullName,
                LibraryName = l.Name,
                a.CheckOutTime,
                a.UpdatedAtUtc,
                a.CreatedAtUtc,
            })
            .Take(8)
            .ToListAsync(cancellationToken);

        var nowUtc = DateTime.UtcNow;
        return rows.Select(x =>
        {
            var occurred = x.UpdatedAtUtc ?? x.CreatedAtUtc;
            return new DashboardActivityItemResponse
            {
                Id = x.Id.ToString(),
                Actor = x.MemberName,
                Action = x.CheckOutTime.HasValue ? "checked out at" : "checked in at",
                Target = x.LibraryName,
                OccurredAtUtc = occurred,
                TimeLabel = FormatRelativeTime(nowUtc - occurred),
            };
        }).ToList();
    }

    private async Task<List<DashboardNotificationItemResponse>> LoadNotificationsAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var items = await _notificationService.GetForUserAsync(userId, cancellationToken);
        return items
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(4)
            .Select(x => new DashboardNotificationItemResponse
            {
                Id = x.Id,
                Title = x.Title ?? string.Empty,
                Message = x.Message ?? string.Empty,
                NotificationType = x.NotificationType ?? "general",
                IsRead = x.IsRead,
                CreatedAtUtc = x.CreatedAtUtc,
            })
            .ToList();
    }

    private async Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        return user is not null && await _userManager.IsInRoleAsync(user, RoleDefinitions.SuperAdmin);
    }

    private static int NormalizeDays(int days) => days switch
    {
        <= 0 => 30,
        > 90 => 90,
        _ => days,
    };

    private static string FormatRelativeTime(TimeSpan elapsed)
    {
        if (elapsed.TotalMinutes < 1) return "just now";
        if (elapsed.TotalMinutes < 60) return $"{(int)elapsed.TotalMinutes}m ago";
        if (elapsed.TotalHours < 24) return $"{(int)elapsed.TotalHours}h ago";
        return $"{(int)elapsed.TotalDays}d ago";
    }

    private sealed record DashboardScope(
        bool IsSuperAdmin,
        IReadOnlyCollection<Guid> LibraryIds,
        IReadOnlyCollection<Guid> BranchIds,
        string ScopeLabel);

    private sealed class ScopedPlanRow
    {
        public Guid PlanId { get; init; }
        public Guid MemberId { get; init; }
        public string MemberName { get; init; } = string.Empty;
        public string PlanName { get; init; } = string.Empty;
        public Guid BranchId { get; init; }
        public Guid LibraryId { get; init; }
        public decimal Amount { get; init; }
        public decimal PaidAmount { get; init; }
        public DateTime CreatedAtUtc { get; init; }
        public bool IsRenewal { get; init; }
        public string PaymentStatus { get; init; } = string.Empty;
    }
}
