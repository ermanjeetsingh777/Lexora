using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Helpers;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Application.Services;

/// <summary>
/// Shared DB-level filter / sort / page projection for member lists.
/// </summary>
internal static class MemberListQueryExecutor
{
    internal sealed class Row
    {
        public Guid Id { get; set; }
        public bool IsActive { get; set; }
        public string? MembershipNo { get; set; }
        public string Shift { get; set; } = string.Empty;
        public string? PhotoStoragePath { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string InstitutionName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string LibraryName { get; set; } = string.Empty;
        public DateTime JoinedOn { get; set; }
        public string? SeatNumber { get; set; }
        public Guid? PlanId { get; set; }
        public string? PlanName { get; set; }
        public decimal PlanPrice { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal AdjustmentAmount { get; set; }
        public decimal DueAmount { get; set; }
        public int DurationInDays { get; set; }
        public DateOnly? PlanStartDate { get; set; }
        public DateOnly? PlanEndDate { get; set; }
        public DateOnly? LastVisit { get; set; }
        public int VisitsCount { get; set; }
    }

    internal sealed class SummaryRow
    {
        public bool IsActive { get; set; }
        public string Shift { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string? PlanName { get; set; }
        public DateTime JoinedOn { get; set; }
        public DateOnly? PlanEndDate { get; set; }
        public decimal DueAmount { get; set; }
    }

    public static IQueryable<Row> Project(IQueryable<Member> members)
    {
        var syntheticSuffix = MemberContactHelper.SyntheticEmailSuffix;
        var defaultSyntheticSuffix = "@" + MemberContactHelper.DefaultSyntheticEmailDomain;

        return members.Select(m => new Row
        {
            Id = m.Id,
            IsActive = m.IsActive,
            MembershipNo = m.MembershipNo,
            Shift = m.Shift,
            PhotoStoragePath = m.PhotoStoragePath,
            FullName = m.FullName,
            Email = m.Email ?? (m.User.Email != null
                && (m.User.Email.EndsWith(syntheticSuffix) || m.User.Email.EndsWith(defaultSyntheticSuffix))
                    ? null
                    : m.User.Email),
            Phone = m.PhoneNumber,
            InstitutionName = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.Institution.Name).FirstOrDefault() ?? string.Empty,
            BranchName = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.Branch.Name).FirstOrDefault() ?? string.Empty,
            LibraryName = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.Library.Name).FirstOrDefault() ?? string.Empty,
            JoinedOn = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.JoinedOn).FirstOrDefault(),
            SeatNumber = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.Seat != null ? x.Seat.SeatNumber : null).FirstOrDefault(),
            PlanId = m.MemberPlans.Where(x => x.IsCurrent).Select(x => (Guid?)x.PlanId).FirstOrDefault(),
            PlanName = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.Plan.Name).FirstOrDefault(),
            PlanPrice = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.Plan.Price).FirstOrDefault(),
            Amount = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.Amount).FirstOrDefault(),
            PaidAmount = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.PaidAmount).FirstOrDefault(),
            AdjustmentAmount = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.AdjustmentAmount ?? 0).FirstOrDefault(),
            DueAmount = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.DueAmount).FirstOrDefault(),
            DurationInDays = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.Plan.DurationInDays).FirstOrDefault(),
            PlanStartDate = m.MemberPlans.Where(x => x.IsCurrent).Select(x => (DateOnly?)x.StartDate).FirstOrDefault(),
            PlanEndDate = m.MemberPlans.Where(x => x.IsCurrent).Select(x => (DateOnly?)x.EndDate).FirstOrDefault(),
            LastVisit = m.Attendances.OrderByDescending(x => x.AttendanceDate).Select(x => (DateOnly?)x.AttendanceDate).FirstOrDefault(),
            VisitsCount = m.Attendances.Count(),
        });
    }

    public static IQueryable<SummaryRow> ProjectSummary(IQueryable<Member> members)
    {
        return members.Select(m => new SummaryRow
        {
            IsActive = m.IsActive,
            Shift = m.Shift,
            BranchName = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.Branch.Name).FirstOrDefault() ?? string.Empty,
            PlanName = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.Plan.Name).FirstOrDefault(),
            JoinedOn = m.MemberLibraries.Where(x => x.IsCurrent).Select(x => x.JoinedOn).FirstOrDefault(),
            PlanEndDate = m.MemberPlans.Where(x => x.IsCurrent).Select(x => (DateOnly?)x.EndDate).FirstOrDefault(),
            DueAmount = m.MemberPlans.Where(x => x.IsCurrent).Select(x => x.DueAmount).FirstOrDefault(),
        });
    }

    public static IQueryable<Row> ApplyFilters(IQueryable<Row> query, MemberListQuery q, DateOnly today)
    {
        var statuses = SplitCsv(q.Statuses);
        var branches = SplitCsv(q.Branches).ToList();
        var libraries = SplitCsv(q.Libraries).ToList();
        var shifts = SplitCsv(q.Shifts).ToList();
        var plans = SplitCsv(q.Plans);
        var lifecycles = SplitCsv(q.Lifecycles).ToList();
        var search = q.Search?.Trim() ?? string.Empty;

        if (statuses.Count > 0)
        {
            var wantActive = statuses.Contains("Active");
            var wantInactive = statuses.Contains("Inactive");
            if (wantActive && !wantInactive)
                query = query.Where(x => x.IsActive);
            else if (wantInactive && !wantActive)
                query = query.Where(x => !x.IsActive);
        }

        if (branches.Count > 0)
            query = query.Where(x => branches.Contains(x.BranchName));

        if (libraries.Count > 0)
            query = query.Where(x => libraries.Contains(x.LibraryName));

        if (shifts.Count > 0)
            query = query.Where(x => shifts.Contains(x.Shift));

        if (plans.Count > 0)
        {
            var includeNoPlan = plans.Contains("No plan");
            var named = plans.Where(p => !string.Equals(p, "No plan", StringComparison.OrdinalIgnoreCase)).ToList();
            if (includeNoPlan && named.Count > 0)
                query = query.Where(x => x.PlanEndDate == null || (x.PlanName != null && named.Contains(x.PlanName)));
            else if (includeNoPlan)
                query = query.Where(x => x.PlanEndDate == null);
            else
                query = query.Where(x => x.PlanName != null && named.Contains(x.PlanName));
        }

        if (lifecycles.Count > 0 || q.NeedsAction)
        {
            var in7 = today.AddDays(7);
            var ago7 = today.AddDays(-7);
            var ago14Join = today.AddDays(-14).ToDateTime(TimeOnly.MinValue);
            var filterLife = lifecycles.Count > 0;
            var needsAction = q.NeedsAction;

            query = query.Where(x =>
                (
                    !filterLife ||
                    (x.PlanEndDate == null && lifecycles.Contains("No plan")) ||
                    (x.PlanEndDate != null && x.PlanEndDate < today && x.PlanEndDate >= ago7 && x.DueAmount <= 0 && lifecycles.Contains("Grace")) ||
                    (x.PlanEndDate != null && x.PlanEndDate < today && !(x.PlanEndDate >= ago7 && x.DueAmount <= 0) && lifecycles.Contains("Expired")) ||
                    (x.PlanEndDate != null && x.PlanEndDate >= today && x.JoinedOn >= ago14Join && lifecycles.Contains("New")) ||
                    (x.PlanEndDate != null && x.PlanEndDate >= today && x.PlanEndDate <= in7 && x.JoinedOn < ago14Join && lifecycles.Contains("Expiring soon")) ||
                    (x.PlanEndDate != null && x.PlanEndDate > in7 && x.JoinedOn < ago14Join && lifecycles.Contains("Active"))
                )
                &&
                (
                    !needsAction ||
                    x.PlanEndDate == null ||
                    x.PlanEndDate < today ||
                    (x.PlanEndDate >= today && x.PlanEndDate <= in7) ||
                    (x.PlanEndDate >= today && x.JoinedOn >= ago14Join)
                ));
        }

        if (search.Length > 0)
        {
            var s = search.ToLower();
            query = query.Where(x =>
                x.Id.ToString().ToLower().Contains(s) ||
                (x.FullName != null && x.FullName.ToLower().Contains(s)) ||
                (x.Email != null && x.Email.ToLower().Contains(s)) ||
                (x.Phone != null && x.Phone.ToLower().Contains(s)) ||
                (x.MembershipNo != null && x.MembershipNo.ToLower().Contains(s)) ||
                x.InstitutionName.ToLower().Contains(s) ||
                x.BranchName.ToLower().Contains(s) ||
                x.LibraryName.ToLower().Contains(s) ||
                x.Shift.ToLower().Contains(s) ||
                (x.PlanName != null && x.PlanName.ToLower().Contains(s)));
        }

        return query;
    }

    public static IQueryable<Row> ApplySort(IQueryable<Row> query, MemberListQuery q)
    {
        var dirAsc = !string.Equals(q.SortDir, "desc", StringComparison.OrdinalIgnoreCase);
        var sortBy = (q.SortBy ?? "planExpiry").Trim().ToLowerInvariant();

        return sortBy switch
        {
            "name" => dirAsc ? query.OrderBy(x => x.FullName) : query.OrderByDescending(x => x.FullName),
            "status" => dirAsc ? query.OrderBy(x => x.IsActive ? 0 : 1) : query.OrderByDescending(x => x.IsActive ? 0 : 1),
            "branch" => dirAsc ? query.OrderBy(x => x.BranchName) : query.OrderByDescending(x => x.BranchName),
            "shift" => dirAsc ? query.OrderBy(x => x.Shift) : query.OrderByDescending(x => x.Shift),
            "plan" => dirAsc ? query.OrderBy(x => x.PlanName) : query.OrderByDescending(x => x.PlanName),
            "joindate" => dirAsc ? query.OrderBy(x => x.JoinedOn) : query.OrderByDescending(x => x.JoinedOn),
            "feesowed" => dirAsc ? query.OrderBy(x => x.DueAmount) : query.OrderByDescending(x => x.DueAmount),
            "attendancerate" => dirAsc ? query.OrderBy(x => x.VisitsCount) : query.OrderByDescending(x => x.VisitsCount),
            _ => dirAsc ? query.OrderBy(x => x.PlanEndDate) : query.OrderByDescending(x => x.PlanEndDate),
        };
    }

    public static async Task<PagedResult<MemberListResponse>> ToPagedAsync(
        IQueryable<Row> query,
        MemberListQuery q,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize <= 0 ? 12 : q.PageSize, 1, 500);

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var items = rows.Select(x => MapRow(x, now, today)).ToList();
        return new PagedResult<MemberListResponse>(items, totalCount, page, pageSize);
    }

    public static MemberListResponse MapRow(Row x, DateTime now, DateOnly today)
    {
        var name = x.FullName?.Trim() ?? string.Empty;
        var joinedDate = x.JoinedOn == default ? now.Date : x.JoinedOn.Date;
        var totalMembershipDays = Math.Max(1, (now.Date - joinedDate).Days + 1);
        var attendanceRate = Math.Min(100, Math.Round((decimal)x.VisitsCount / totalMembershipDays * 100, 1));
        var planAmount = x.Amount > 0 ? x.Amount : x.PlanPrice;
        var (daysRemaining, _, planStatus) = MemberPlanMetricsHelper.ComputePlanMetrics(x.PlanEndDate, planAmount, today);
        var feesOwed = MemberPlanMetricsHelper.ComputeMemberFeesOwed(x.DueAmount);

        return new MemberListResponse
        {
            Id = x.Id,
            Name = name,
            Email = x.Email,
            Phone = x.Phone,
            Avatar = $"https://api.dicebear.com/9.x/initials/svg?seed={Uri.EscapeDataString(name)}&backgroundType=gradientLinear",
            AvatarHue = 0,
            HasPhoto = !string.IsNullOrWhiteSpace(x.PhotoStoragePath),
            Institution = x.InstitutionName,
            Branch = x.BranchName,
            Library = x.LibraryName,
            Membership = x.MembershipNo,
            Plan = x.PlanName,
            PlanId = x.PlanId?.ToString(),
            Shift = x.Shift,
            Seat = x.SeatNumber,
            SeatNumber = x.SeatNumber,
            Status = x.IsActive ? "Active" : "Inactive",
            PlanStatus = planStatus,
            JoinDate = DateOnly.FromDateTime(joinedDate),
            LastVisit = x.LastVisit,
            Visits30d = x.VisitsCount,
            AttendanceRate = attendanceRate,
            FeesOwed = feesOwed,
            PlanPrice = planAmount,
            PaidAmount = x.PaidAmount,
            AdjustmentAmount = x.AdjustmentAmount,
            DueAmount = x.DueAmount,
            DaysRemaining = daysRemaining,
            PlanStartDate = x.PlanStartDate,
            PlanEndDate = x.PlanEndDate,
            PlanDurationInDays = x.DurationInDays,
        };
    }

    public static MembershipSummaryResponse BuildSummary(IReadOnlyList<SummaryRow> rows, DateOnly today)
    {
        var statusCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var planCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var branchCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var shiftCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var lifecycleCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        var active = 0;
        var expired = 0;
        var expiringSoon = 0;
        var grace = 0;
        var noPlan = 0;
        var needsAction = 0;
        var premium = 0;
        decimal feesDue = 0;

        foreach (var m in rows)
        {
            var status = m.IsActive ? "Active" : "Inactive";
            statusCounts[status] = statusCounts.GetValueOrDefault(status) + 1;
            if (m.IsActive) active++;

            var planKey = string.IsNullOrWhiteSpace(m.PlanName) ? "No plan" : m.PlanName.Trim();
            planCounts[planKey] = planCounts.GetValueOrDefault(planKey) + 1;
            if (planKey is "Yearly" or "Half Yearly") premium++;

            if (!string.IsNullOrWhiteSpace(m.BranchName) && m.BranchName != "—")
                branchCounts[m.BranchName] = branchCounts.GetValueOrDefault(m.BranchName) + 1;

            if (!string.IsNullOrWhiteSpace(m.Shift) && m.Shift != "—")
                shiftCounts[m.Shift] = shiftCounts.GetValueOrDefault(m.Shift) + 1;

            var fees = MemberPlanMetricsHelper.ComputeMemberFeesOwed(m.DueAmount);
            var joinDate = m.JoinedOn == default ? today : DateOnly.FromDateTime(m.JoinedOn);
            var life = MemberLifecycleHelper.Compute(m.PlanEndDate, joinDate, fees, today);
            lifecycleCounts[life.State] = lifecycleCounts.GetValueOrDefault(life.State) + 1;
            if (life.State == "Expired") expired++;
            if (life.State is "Expiring soon" or "Grace") expiringSoon++;
            if (life.State == "Grace") grace++;
            if (life.State == "No plan") noPlan++;
            if (life.NeedsAction) needsAction++;
            feesDue += fees;
        }

        return new MembershipSummaryResponse
        {
            TotalMembers = rows.Count,
            ActiveCount = active,
            ExpiredCount = expired,
            ExpiringSoonCount = expiringSoon,
            GraceCount = grace,
            NoPlanCount = noPlan,
            NeedsActionCount = needsAction,
            FeesDueTotal = feesDue,
            PremiumCount = premium,
            Branches = branchCounts.Keys.OrderBy(x => x).ToList(),
            Plans = planCounts.Keys.OrderBy(x => x).ToList(),
            Shifts = shiftCounts.Keys.OrderBy(x => x).ToList(),
            StatusCounts = statusCounts,
            PlanCounts = planCounts,
            BranchCounts = branchCounts,
            ShiftCounts = shiftCounts,
            LifecycleCounts = lifecycleCounts,
        };
    }

    private static HashSet<string> SplitCsv(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        return csv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
}
