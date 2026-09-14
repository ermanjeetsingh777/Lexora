namespace SLMS_API.Application.Helpers;

/// <summary>
/// Mirrors SLMS_UI member-lifecycle.util.ts (BR-06.1 / BR-06.2).
/// </summary>
public static class MemberLifecycleHelper
{
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
        else if (daysLeft < 0 && daysLeft >= -7 && fees == 0)
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
}
