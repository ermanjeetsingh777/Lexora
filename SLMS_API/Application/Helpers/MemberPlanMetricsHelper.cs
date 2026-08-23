using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Helpers;

public static class MemberPlanMetricsHelper
{
    /// <summary>
    /// BR-06.1: signed days remaining; grace = expired ≤7 days with no dues.
    /// </summary>
    public static (int DaysRemaining, decimal FeesOwed, MemberPlanStatus PlanStatus) ComputePlanMetrics(
        DateOnly? planEndDate,
        decimal planPrice,
        DateOnly today)
    {
        if (planEndDate is null)
        {
            return (0, 0, MemberPlanStatus.NoPlan);
        }

        var daysRemaining = planEndDate.Value.DayNumber - today.DayNumber;

        if (daysRemaining > 7)
        {
            return (daysRemaining, 0, MemberPlanStatus.Active);
        }

        if (daysRemaining > 0)
        {
            return (daysRemaining, 0, MemberPlanStatus.ExpiringSoon);
        }

        if (daysRemaining == 0)
        {
            return (0, 0, MemberPlanStatus.ExpiringSoon);
        }

        var daysPast = Math.Abs(daysRemaining);
        if (daysPast <= 7)
        {
            return (daysRemaining, 0, MemberPlanStatus.Expired);
        }

        return (daysRemaining, planPrice, MemberPlanStatus.Expired);
    }

    /// <summary>
    /// Pending plan payments: unpaid balance on the current plan, or full plan price after grace expiry.
    /// </summary>
    public static decimal ComputeMemberFeesOwed(
        DateOnly? planEndDate,
        decimal planAmount,
        decimal paidAmount,
        DateOnly today)
    {
        var (_, expiredDue, _) = ComputePlanMetrics(planEndDate, planAmount, today);
        var partialDue = planAmount > 0
            ? Math.Max(0, planAmount - paidAmount)
            : 0m;

        return expiredDue > 0 ? expiredDue : partialDue;
    }
}
