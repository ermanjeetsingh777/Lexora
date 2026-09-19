namespace SLMS_API.Application.Helpers;

/// <summary>
/// Mirrors SLMS_UI member-lifecycle.util.ts (BR-06.1 / BR-06.2).
/// </summary>
public static class MemberLifecycleHelper
{
    /// <summary>Days after plan EndDate with zero dues where check-in is still allowed.</summary>
    public const int MembershipGraceDays = 7;

    public sealed record LifecycleInfo(
        string State,
        int DaysLeft,
        string ExpiryIso,
        bool NeedsAction);

    public static LifecycleInfo Compute(DateOnly? planEndDate, DateOnly? joinDate, decimal feesOwed, DateOnly today)
    {
        var hasPlan = planEndDate.HasValue;
        var daysLeft = hasPlan ? planEndDate!.Value.DayNumber - today.DayNumber : 0;
        var joinedDaysAgo = joinDate.HasValue
            ? Math.Max(0, today.DayNumber - joinDate.Value.DayNumber)
            : 999;
        var fees = feesOwed;

        string state;
        if (!hasPlan)
        {
            state = "No plan";
        }
        else if (daysLeft < 0 && daysLeft >= -MembershipGraceDays && fees == 0)
        {
            state = "Grace";
        }
        else if (daysLeft < 0)
        {
            state = "Expired";
        }
        else if (joinedDaysAgo <= 14)
        {
            state = "New";
        }
        else if (daysLeft <= 7)
        {
            state = "Expiring soon";
        }
        else
        {
            state = "Active";
        }

        var action = !hasPlan
            ? "Purchase plan"
            : state == "Expired" && fees > 0
                ? "Collect dues & renew"
                : state == "Expired"
                    ? "Renew plan"
                    : state == "Grace"
                        ? "Renew within grace"
                        : state == "Expiring soon"
                            ? "Send renewal reminder"
                            : state == "New"
                                ? "Complete onboarding"
                                : null;

        var expiryIso = planEndDate?.ToString("yyyy-MM-dd") ?? string.Empty;
        return new LifecycleInfo(state, daysLeft, expiryIso, action is not null);
    }

    /// <summary>
    /// Allows check-in for Active / New / Expiring soon / Grace.
    /// Blocks Expired (past membership grace) and No plan.
    /// </summary>
    public static bool AllowsAttendanceCheckIn(LifecycleInfo life) =>
        life.State is not ("Expired" or "No plan");

    public static string CheckInBlockedMessage(LifecycleInfo life)
    {
        if (life.State == "No plan")
        {
            return "No active plan. Assign or renew a membership plan before check-in.";
        }

        if (life.State == "Expired")
        {
            var expiry = string.IsNullOrEmpty(life.ExpiryIso) ? "the plan end date" : life.ExpiryIso;
            return $"Plan expired on {expiry}. Renew the plan (membership grace of {MembershipGraceDays} days has ended) before check-in.";
        }

        return "Check-in is not allowed for this membership.";
    }

    public static void EnsureAllowsAttendanceCheckIn(DateOnly? planEndDate, decimal feesOwed, DateOnly today)
    {
        var life = Compute(planEndDate, joinDate: null, feesOwed, today);
        if (!AllowsAttendanceCheckIn(life))
        {
            throw new InvalidOperationException(CheckInBlockedMessage(life));
        }
    }
}
