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
        var period = DashboardPeriodHelper.Parse(query.Period);
        var (dateFrom, dateTo) = DashboardPeriodHelper.ResolveRange(period, DateOnly.FromDateTime(DateTime.UtcNow));
        var rangeStartUtc = dateFrom.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var planRows = await LoadScopedPlanRowsAsync(scope.LibraryIds, cancellationToken);
        var revenueBreakdown = DashboardPeriodHelper.ComputeBreakdown(
            planRows.Select(x => (x.CreatedAtUtc, x.PaidAmount)),
            DateTime.UtcNow);

        var trendRows = planRows.Select(x => (x.CreatedAtUtc, x.PaidAmount, x.IsRenewal));
        var trend = DashboardPeriodHelper.BuildRevenueTrend(period, dateTo, trendRows);
        var revenueCharts = DashboardPeriodHelper.BuildRevenueCharts(dateTo, trendRows);

        var rangeRows = planRows.Where(x => x.CreatedAtUtc >= rangeStartUtc).ToList();
        var totalRevenue = rangeRows.Sum(x => x.PaidAmount);
        var totalRenewals = rangeRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount);
        var bucketCount = Math.Max(1, trend.Count);

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
            ScopeLabel = scope.ScopeLabel,
            Period = DashboardPeriodHelper.ToApiValue(period),
            PeriodLabel = DashboardPeriodHelper.GetLabel(period),
            Days = dateTo.DayNumber - dateFrom.DayNumber + 1,
            Trend = trend,
            RevenueBreakdown = revenueBreakdown,
            RevenueCharts = revenueCharts,
            RecentTransactions = transactions,
            Kpis = new DashboardRevenueKpiResponse
            {
                TotalRevenue = totalRevenue,
                TotalRenewals = totalRenewals,
                AvgDailyRevenue = Math.Round(totalRevenue / bucketCount, 2),
                PaidCount = paidCount,
                PendingCount = pendingCount,
            },
        };
    }

    public async Task<DashboardActivityResponse> GetActivityAsync(
        DashboardActivityQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var scope = await ResolveScopeAsync(query, userId, cancellationToken);
        var days = Math.Clamp(query.ActivityDays, 7, 365);
        var limit = Math.Clamp(query.Limit, 10, 200);
        var (items, summary) = await BuildRecentActivityAsync(scope.LibraryIds, days, limit, cancellationToken);

        return new DashboardActivityResponse
        {
            IsSuperAdmin = scope.IsSuperAdmin,
            ScopeLabel = scope.ScopeLabel,
            ActivityDays = days,
            TotalCount = items.Count,
            Summary = summary,
            Items = items,
        };
    }

    private async Task<DashboardOverviewResponse> BuildOverviewAsync(
        DashboardQuery query,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(query, userId, cancellationToken);
        var period = DashboardPeriodHelper.Parse(query.Period);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (dateFrom, dateTo) = DashboardPeriodHelper.ResolveRange(period, today);
        var attendanceFrom = period switch
        {
            DashboardPeriodKind.Monthly => today.AddDays(-29),
            DashboardPeriodKind.Quarterly => DashboardPeriodHelper.ResolveRange(DashboardPeriodKind.Quarterly, today).DateFrom,
            DashboardPeriodKind.Yearly => new DateOnly(today.Year, 1, 1),
            DashboardPeriodKind.All => today.AddDays(-29),
            _ => today.AddDays(-6),
        };
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
                DueAmount = m.MemberPlans
                    .Where(mp => mp.IsCurrent && mp.IsActive && !mp.IsDeleted)
                    .Select(mp => (decimal?)mp.DueAmount)
                    .FirstOrDefault(),
            })
            .Distinct()
            .ToListAsync(cancellationToken);

        var distinctMembers = memberRows
            .GroupBy(x => x.Id)
            .Select(g => g.First())
            .ToList();

        var activeMembers = 0;
        var inactiveMembers = 0;
        var suspendedMembers = 0;
        decimal totalFeesOwed = 0;

        foreach (var member in distinctMembers)
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

            totalFeesOwed += MemberPlanMetricsHelper.ComputeMemberFeesOwed(member.DueAmount ?? 0m);
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
        var revenueByBranch = InstitutionRevenueHelper.AggregateByBranchFrom(
            planRows.Select(x => (x.BranchId, x.PaidAmount, x.CreatedAtUtc)),
            rangeStartUtc);

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
                    RevenueMtd = revenue,
                };
            })
            .OrderByDescending(x => x.OccupancyPercent)
            .Take(6)
            .ToList();

        var rangePlanRows = planRows.Where(x => x.CreatedAtUtc >= rangeStartUtc).ToList();
        var revenueBreakdown = DashboardPeriodHelper.ComputeBreakdown(
            planRows.Select(x => (x.CreatedAtUtc, x.PaidAmount)),
            nowUtc);
        var revenueTrend = DashboardPeriodHelper.BuildRevenueTrend(
            period,
            dateTo,
            planRows.Select(x => (x.CreatedAtUtc, x.PaidAmount, x.IsRenewal)));
        var revenueCharts = DashboardPeriodHelper.BuildRevenueCharts(
            dateTo,
            planRows.Select(x => (x.CreatedAtUtc, x.PaidAmount, x.IsRenewal)));
        var attendanceTrend = await BuildAttendanceTrendAsync(libraryIds, attendanceFrom, today, totalCapacity, cancellationToken);

        var libraryPerformance = await BuildLibraryPerformanceAsync(
            libraryIds,
            memberCountsByLibrary,
            planRows,
            rangeStartUtc,
            cancellationToken);

        var (recentActivity, activitySummary) = await BuildRecentActivityAsync(libraryIds, days: 30, limit: 25, cancellationToken);
        var notifications = await LoadNotificationsAsync(userIdString, cancellationToken);

        return new DashboardOverviewResponse
        {
            IsSuperAdmin = scope.IsSuperAdmin,
            ScopeLabel = scope.ScopeLabel,
            Period = DashboardPeriodHelper.ToApiValue(period),
            PeriodLabel = DashboardPeriodHelper.GetLabel(period),
            Days = dateTo.DayNumber - dateFrom.DayNumber + 1,
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
                TotalMembers = memberRows.Count,
                TotalLibraries = libraryIds.Count,
            },
            RevenueBreakdown = revenueBreakdown,
            RevenueTrend = revenueTrend,
            RevenueCharts = revenueCharts,
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
            LibraryPerformance = libraryPerformance,
            RecentActivity = recentActivity,
            ActivitySummary = activitySummary,
            Notifications = notifications,
        };
    }

    private async Task<List<DashboardLibraryPerformanceResponse>> BuildLibraryPerformanceAsync(
        IReadOnlyCollection<Guid> libraryIds,
        IReadOnlyDictionary<Guid, int> memberCountsByLibrary,
        IReadOnlyCollection<ScopedPlanRow> planRows,
        DateTime rangeStartUtc,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return [];
        }

        var libraries = await _db.Libraries.AsNoTracking()
            .Where(l => libraryIds.Contains(l.Id) && !l.IsDeleted)
            .Select(l => new { l.Id, l.Name, l.BranchId, l.Capacity })
            .ToListAsync(cancellationToken);

        var branchIds = libraries.Select(l => l.BranchId).Distinct().ToList();
        var branchNames = branchIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Branches.AsNoTracking()
                .Where(b => branchIds.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

        var revenueByLibrary = InstitutionRevenueHelper.AggregateByLibraryFrom(
            planRows.Select(x => (x.LibraryId, x.PaidAmount, x.CreatedAtUtc)),
            rangeStartUtc);

        return libraries
            .Select(l =>
            {
                memberCountsByLibrary.TryGetValue(l.Id, out var members);
                revenueByLibrary.TryGetValue(l.Id, out var revenue);
                var capacity = l.Capacity ?? 0;
                var occupancy = capacity > 0
                    ? Math.Round((decimal)members / capacity * 100m, 1)
                    : 0m;

                branchNames.TryGetValue(l.BranchId, out var branchName);

                return new DashboardLibraryPerformanceResponse
                {
                    LibraryId = l.Id,
                    LibraryName = l.Name,
                    BranchName = branchName ?? "—",
                    Members = members,
                    OccupancyPercent = occupancy,
                    RevenueMtd = revenue,
                };
            })
            .OrderByDescending(x => x.Members)
            .Take(8)
            .ToList();
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
            ? $"All institutions · {libraryIds.Count} libraries"
            : $"Your workspace · {libraryIds.Count} accessible libraries";

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

    private async Task<(List<DashboardActivityItemResponse> Items, DashboardActivitySummaryResponse Summary)> BuildRecentActivityAsync(
        IReadOnlyCollection<Guid> libraryIds,
        int days,
        int limit,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return ([], new DashboardActivitySummaryResponse());
        }

        var since = DateTime.UtcNow.AddDays(-Math.Clamp(days, 1, 365));
        var todayStart = DateTime.UtcNow.Date;
        var nowUtc = DateTime.UtcNow;
        var items = new List<DashboardActivityItemResponse>();
        var attendanceTake = Math.Min(limit * 2, 250);
        var paymentTake = Math.Min(limit, 200);
        var enrollmentTake = Math.Min(Math.Max(limit / 2, 20), 100);
        var bookTake = Math.Min(Math.Max(limit / 2, 20), 100);
        var pendingTake = Math.Min(50, Math.Max(limit / 4, 10));

        var attendanceRows = await (
            from a in _db.MemberAttendances.AsNoTracking()
            join m in _db.Members.AsNoTracking() on a.MemberId equals m.Id
            join l in _db.Libraries.AsNoTracking() on a.LibraryId equals l.Id
            where !a.IsDeleted && libraryIds.Contains(a.LibraryId) && a.CreatedAtUtc >= since
            orderby a.UpdatedAtUtc descending, a.CreatedAtUtc descending
            select new
            {
                a.Id,
                MemberName = m.FullName ?? "Member",
                LibraryName = l.Name,
                a.SeatNo,
                a.CheckInTime,
                a.CheckOutTime,
                a.CreatedAtUtc,
                a.UpdatedAtUtc,
            })
            .Take(attendanceTake)
            .ToListAsync(cancellationToken);

        foreach (var row in attendanceRows)
        {
            var seatDetail = string.IsNullOrWhiteSpace(row.SeatNo) ? null : $"Seat {row.SeatNo}";
            var occurred = row.CreatedAtUtc;
            items.Add(new DashboardActivityItemResponse
            {
                Id = $"checkin-{row.Id}",
                ActivityType = "check-in",
                Actor = row.MemberName,
                Action = "checked in at",
                Target = row.LibraryName,
                Detail = seatDetail,
                OccurredAtUtc = occurred,
                TimeLabel = FormatRelativeTime(nowUtc - occurred),
            });

            if (row.CheckOutTime.HasValue)
            {
                var checkoutAt = row.UpdatedAtUtc ?? row.CreatedAtUtc;
                items.Add(new DashboardActivityItemResponse
                {
                    Id = $"checkout-{row.Id}",
                    ActivityType = "check-out",
                    Actor = row.MemberName,
                    Action = "checked out from",
                    Target = row.LibraryName,
                    Detail = seatDetail,
                    OccurredAtUtc = checkoutAt,
                    TimeLabel = FormatRelativeTime(nowUtc - checkoutAt),
                });
            }
        }

        var paymentRows = await (
            from mp in _db.MemberPlans.AsNoTracking()
            join m in _db.Members.AsNoTracking() on mp.MemberId equals m.Id
            join ml in _db.MemberLibraries.AsNoTracking() on m.Id equals ml.MemberId
            join l in _db.Libraries.AsNoTracking() on ml.LibraryId equals l.Id
            join p in _db.Plans.AsNoTracking() on mp.PlanId equals p.Id
            where !mp.IsDeleted
                  && !m.IsDeleted
                  && !ml.IsDeleted
                  && ml.IsCurrent
                  && libraryIds.Contains(ml.LibraryId)
                  && mp.PaidAmount > 0
                  && mp.CreatedAtUtc >= since
            orderby mp.CreatedAtUtc descending
            select new
            {
                mp.Id,
                mp.CreatedAtUtc,
                mp.PaidAmount,
                MemberName = m.FullName ?? "Member",
                PlanName = p.Name,
                LibraryName = l.Name,
                PriorPlanCount = m.MemberPlans.Count(x => !x.IsDeleted && x.CreatedAtUtc < mp.CreatedAtUtc),
            })
            .Take(paymentTake)
            .ToListAsync(cancellationToken);

        foreach (var row in paymentRows)
        {
            var isRenewal = row.PriorPlanCount > 0;
            items.Add(new DashboardActivityItemResponse
            {
                Id = $"payment-{row.Id}",
                ActivityType = isRenewal ? "renewal" : "payment",
                Actor = row.MemberName,
                Action = isRenewal ? "renewed plan at" : "paid for plan at",
                Target = row.LibraryName,
                Detail = $"{row.PlanName} · ₹{FormatActivityAmount(row.PaidAmount)}",
                OccurredAtUtc = row.CreatedAtUtc,
                TimeLabel = FormatRelativeTime(nowUtc - row.CreatedAtUtc),
            });
        }

        var enrollmentRows = await (
            from ml in _db.MemberLibraries.AsNoTracking()
            join m in _db.Members.AsNoTracking() on ml.MemberId equals m.Id
            join l in _db.Libraries.AsNoTracking() on ml.LibraryId equals l.Id
            where !ml.IsDeleted && libraryIds.Contains(ml.LibraryId) && ml.JoinedOn >= since
            orderby ml.JoinedOn descending
            select new
            {
                ml.Id,
                ml.JoinedOn,
                MemberName = m.FullName ?? "Member",
                LibraryName = l.Name,
            })
            .Take(enrollmentTake)
            .ToListAsync(cancellationToken);

        foreach (var row in enrollmentRows)
        {
            items.Add(new DashboardActivityItemResponse
            {
                Id = $"enrollment-{row.Id}",
                ActivityType = "enrollment",
                Actor = row.MemberName,
                Action = "joined library",
                Target = row.LibraryName,
                Detail = "New member enrolled",
                OccurredAtUtc = row.JoinedOn,
                TimeLabel = FormatRelativeTime(nowUtc - row.JoinedOn),
            });
        }

        var bookRows = await (
            from bl in _db.BookLoans.AsNoTracking()
            join b in _db.Books.AsNoTracking() on bl.BookId equals b.Id
            join l in _db.Libraries.AsNoTracking() on bl.LibraryId equals l.Id
            where !bl.IsDeleted
                  && libraryIds.Contains(bl.LibraryId)
                  && (bl.CheckedOutAtUtc >= since || (bl.ReturnedAtUtc.HasValue && bl.ReturnedAtUtc.Value >= since))
            orderby bl.UpdatedAtUtc descending, bl.CheckedOutAtUtc descending
            select new
            {
                bl.Id,
                bl.MemberName,
                BookTitle = b.Title,
                LibraryName = l.Name,
                bl.CheckedOutAtUtc,
                bl.ReturnedAtUtc,
            })
            .Take(bookTake)
            .ToListAsync(cancellationToken);

        foreach (var row in bookRows)
        {
            if (row.CheckedOutAtUtc >= since)
            {
                items.Add(new DashboardActivityItemResponse
                {
                    Id = $"book-checkout-{row.Id}",
                    ActivityType = "book-checkout",
                    Actor = row.MemberName,
                    Action = "borrowed book at",
                    Target = row.LibraryName,
                    Detail = row.BookTitle,
                    OccurredAtUtc = row.CheckedOutAtUtc,
                    TimeLabel = FormatRelativeTime(nowUtc - row.CheckedOutAtUtc),
                });
            }

            if (row.ReturnedAtUtc.HasValue && row.ReturnedAtUtc.Value >= since)
            {
                var returnedAt = row.ReturnedAtUtc.Value;
                items.Add(new DashboardActivityItemResponse
                {
                    Id = $"book-return-{row.Id}",
                    ActivityType = "book-return",
                    Actor = row.MemberName,
                    Action = "returned book at",
                    Target = row.LibraryName,
                    Detail = row.BookTitle,
                    OccurredAtUtc = returnedAt,
                    TimeLabel = FormatRelativeTime(nowUtc - returnedAt),
                });
            }
        }

        var pendingRows = await (
            from mp in _db.MemberPlans.AsNoTracking()
            join m in _db.Members.AsNoTracking() on mp.MemberId equals m.Id
            join ml in _db.MemberLibraries.AsNoTracking() on m.Id equals ml.MemberId
            join l in _db.Libraries.AsNoTracking() on ml.LibraryId equals l.Id
            join p in _db.Plans.AsNoTracking() on mp.PlanId equals p.Id
            where !mp.IsDeleted
                  && !m.IsDeleted
                  && !ml.IsDeleted
                  && ml.IsCurrent
                  && libraryIds.Contains(ml.LibraryId)
                  && mp.Amount > 0
                  && mp.PaidAmount < mp.Amount
                  && (mp.UpdatedAtUtc ?? mp.CreatedAtUtc) >= since
            orderby (mp.UpdatedAtUtc ?? mp.CreatedAtUtc) descending
            select new
            {
                mp.Id,
                mp.UpdatedAtUtc,
                mp.CreatedAtUtc,
                mp.Amount,
                mp.PaidAmount,
                MemberName = m.FullName ?? "Member",
                PlanName = p.Name,
                LibraryName = l.Name,
            })
            .Take(pendingTake)
            .ToListAsync(cancellationToken);

        foreach (var row in pendingRows)
        {
            var due = row.Amount - row.PaidAmount;
            var occurred = row.UpdatedAtUtc ?? row.CreatedAtUtc;
            items.Add(new DashboardActivityItemResponse
            {
                Id = $"pending-{row.Id}",
                ActivityType = "pending-payment",
                Actor = row.MemberName,
                Action = "has pending dues at",
                Target = row.LibraryName,
                Detail = $"{row.PlanName} · ₹{FormatActivityAmount(due)} due",
                OccurredAtUtc = occurred,
                TimeLabel = FormatRelativeTime(nowUtc - occurred),
            });
        }

        var ordered = items
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(limit)
            .ToList();

        var summary = new DashboardActivitySummaryResponse
        {
            TodayCheckIns = attendanceRows.Count(x => x.CreatedAtUtc >= todayStart && x.CheckInTime.HasValue),
            TodayCheckOuts = attendanceRows.Count(x =>
                x.CheckOutTime.HasValue && (x.UpdatedAtUtc ?? x.CreatedAtUtc) >= todayStart),
            TodayPayments = paymentRows.Count(x => x.CreatedAtUtc >= todayStart),
            TodayEnrollments = enrollmentRows.Count(x => x.JoinedOn >= todayStart),
            TodayBookLoans = bookRows.Count(x => x.CheckedOutAtUtc >= todayStart),
            TodayPendingPayments = pendingRows.Count(x => (x.UpdatedAtUtc ?? x.CreatedAtUtc) >= todayStart),
        };

        return (ordered, summary);
    }

    private static string FormatActivityAmount(decimal amount) =>
        amount >= 100000 ? $"{amount / 100000m:0.#}L"
        : amount >= 1000 ? $"{amount / 1000m:0.#}K"
        : amount.ToString("0");

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
