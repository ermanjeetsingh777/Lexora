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

        // Expired past grace — do not auto-create plan-price dues; dues are manual (DueAmount).
        return (daysRemaining, 0, MemberPlanStatus.Expired);
    }

    /// <summary>
    /// Fees owed = manual DueAmount only.
    /// Plan − Paid shortfall is Adjustment (discount), not due.
    /// </summary>
    public static decimal ComputeMemberFeesOwed(decimal dueAmount)
    {
        return Math.Max(0, dueAmount);
    }

    /// <summary>
    /// Split plan money: Amount = Paid + Adjustment + Due.
    /// Shortfall without due → Adjustment. Due is only what the user sets.
    /// </summary>
    public static (decimal Paid, decimal Adjustment, decimal Due) ResolvePlanMoney(
        decimal planAmount,
        decimal? requestedPaid,
        decimal? requestedDue,
        decimal defaultPaidFallback)
    {
        var paid = requestedPaid.HasValue
            ? Math.Round(Math.Max(0, requestedPaid.Value), 2, MidpointRounding.AwayFromZero)
            : Math.Round(Math.Max(0, defaultPaidFallback), 2, MidpointRounding.AwayFromZero);

        var due = requestedDue.HasValue
            ? Math.Round(Math.Max(0, requestedDue.Value), 2, MidpointRounding.AwayFromZero)
            : 0m;

        if (paid > planAmount)
        {
            paid = planAmount;
        }

        if (paid + due > planAmount)
        {
            due = Math.Max(0, Math.Round(planAmount - paid, 2, MidpointRounding.AwayFromZero));
        }

        var adjustment = Math.Max(0, Math.Round(planAmount - paid - due, 2, MidpointRounding.AwayFromZero));
        return (paid, adjustment, due);
    }
}
