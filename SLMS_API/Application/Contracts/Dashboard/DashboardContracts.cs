namespace SLMS_API.Application.Contracts.Dashboard;

public class DashboardQuery
{
    /// <summary>Legacy day window — ignored when <see cref="Period"/> is set.</summary>
    public int Days { get; set; } = 30;

    /// <summary>weekly | monthly | quarterly | yearly | all</summary>
    public string? Period { get; set; }

    public Guid? InstitutionId { get; set; }
    public Guid? BranchId { get; set; }
    public Guid? LibraryId { get; set; }
}

public class DashboardActivityQuery : DashboardQuery
{
    /// <summary>How many days back to include activity (7–365).</summary>
    public int ActivityDays { get; set; } = 90;

    /// <summary>Maximum events returned (10–200).</summary>
    public int Limit { get; set; } = 120;
}

public class DashboardActivityResponse
{
    public bool IsSuperAdmin { get; set; }

    public string ScopeLabel { get; set; } = string.Empty;

    public int ActivityDays { get; set; }

    public int TotalCount { get; set; }

    public DashboardActivitySummaryResponse Summary { get; set; } = new();

    public IReadOnlyList<DashboardActivityItemResponse> Items { get; set; } = [];
}

public class DashboardRevenueBreakdownResponse
{
    public decimal Weekly { get; set; }

    public decimal Monthly { get; set; }

    public decimal Quarterly { get; set; }

    public decimal Yearly { get; set; }

    public decimal AllTime { get; set; }
}

public class DashboardRevenueChartsResponse
{
    public IReadOnlyList<DashboardTrendPointResponse> MonthlyTrend { get; set; } = [];

    public IReadOnlyList<DashboardTrendPointResponse> QuarterlyTrend { get; set; } = [];

    public IReadOnlyList<DashboardTrendPointResponse> YearlyTrend { get; set; } = [];
}

public class DashboardOverviewResponse
{
    public bool IsSuperAdmin { get; set; }
    public string ScopeLabel { get; set; } = string.Empty;
    public string Period { get; set; } = "weekly";
    public string PeriodLabel { get; set; } = string.Empty;
    public int Days { get; set; }
    public DashboardKpiResponse Kpis { get; set; } = new();
    public DashboardRevenueBreakdownResponse RevenueBreakdown { get; set; } = new();
    public DashboardRevenueChartsResponse RevenueCharts { get; set; } = new();
    public IReadOnlyList<DashboardTrendPointResponse> RevenueTrend { get; set; } = [];
    public IReadOnlyList<DashboardAttendanceTrendPointResponse> AttendanceTrend { get; set; } = [];
    public DashboardMemberMixResponse MemberMix { get; set; } = new();
    public IReadOnlyList<DashboardBranchPerformanceResponse> BranchPerformance { get; set; } = [];
    public IReadOnlyList<DashboardLibraryPerformanceResponse> LibraryPerformance { get; set; } = [];
    public IReadOnlyList<DashboardActivityItemResponse> RecentActivity { get; set; } = [];
    public DashboardActivitySummaryResponse ActivitySummary { get; set; } = new();
    public IReadOnlyList<DashboardNotificationItemResponse> Notifications { get; set; } = [];
}

public class DashboardKpiResponse
{
    public int ActiveMembers { get; set; }
    public double ActiveMembersDelta { get; set; }
    public decimal OccupancyPercent { get; set; }
    public double OccupancyDelta { get; set; }
    public decimal RevenueMtd { get; set; }
    public double RevenueMtdDelta { get; set; }
    public int BranchesLive { get; set; }
    public int BranchesMaintenance { get; set; }
    public decimal TotalFeesOwed { get; set; }
    public int AccessibleLibraries { get; set; }
    public int TotalMembers { get; set; }
    public int TotalLibraries { get; set; }
}

public class DashboardTrendPointResponse
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Renewals { get; set; }
}

public class DashboardAttendanceTrendPointResponse
{
    public string Date { get; set; } = string.Empty;
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
}

public class DashboardMemberMixResponse
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int Inactive { get; set; }
    public int Suspended { get; set; }

    /// <summary>Pending plan payments: partial unpaid balance or post-grace expired plan dues.</summary>
    public decimal TotalFeesOwed { get; set; }
}

public class DashboardBranchPerformanceResponse
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string? City { get; set; }
    public int Members { get; set; }
    public decimal OccupancyPercent { get; set; }

    /// <summary>Revenue in the dashboard's selected period filter.</summary>
    public decimal RevenueMtd { get; set; }
}

public class DashboardLibraryPerformanceResponse
{
    public Guid LibraryId { get; set; }

    public string LibraryName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public int Members { get; set; }

    public decimal OccupancyPercent { get; set; }

    /// <summary>Revenue in the dashboard's selected period filter.</summary>
    public decimal RevenueMtd { get; set; }
}

public class DashboardActivitySummaryResponse
{
    public int TodayCheckIns { get; set; }

    public int TodayCheckOuts { get; set; }

    public int TodayPayments { get; set; }

    public int TodayEnrollments { get; set; }

    public int TodayBookLoans { get; set; }

    public int TodayPendingPayments { get; set; }
}

public class DashboardActivityItemResponse
{
    public string Id { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string TimeLabel { get; set; } = string.Empty;
}

public class DashboardNotificationItemResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string NotificationType { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class DashboardRevenueResponse
{
    public bool IsSuperAdmin { get; set; }
    public string ScopeLabel { get; set; } = string.Empty;
    public string Period { get; set; } = "weekly";
    public string PeriodLabel { get; set; } = string.Empty;
    public int Days { get; set; }
    public DashboardRevenueKpiResponse Kpis { get; set; } = new();
    public DashboardRevenueBreakdownResponse RevenueBreakdown { get; set; } = new();
    public DashboardRevenueChartsResponse RevenueCharts { get; set; } = new();
    public IReadOnlyList<DashboardTrendPointResponse> Trend { get; set; } = [];
    public IReadOnlyList<DashboardPaymentTransactionResponse> RecentTransactions { get; set; } = [];
}

public class DashboardRevenueKpiResponse
{
    public decimal TotalRevenue { get; set; }
    public decimal TotalRenewals { get; set; }
    public decimal AvgDailyRevenue { get; set; }
    public int PaidCount { get; set; }
    public int PendingCount { get; set; }
}

public class DashboardPaymentTransactionResponse
{
    public Guid Id { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
