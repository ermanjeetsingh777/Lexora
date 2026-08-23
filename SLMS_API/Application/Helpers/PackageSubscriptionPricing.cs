using SLMS_API.Domain.Entities;

namespace SLMS_API.Application.Helpers;

public sealed record PackageSubscriptionPricingResult(
    decimal PackagePrice,
    decimal AdjustmentAmount,
    decimal AmountPaid,
    int RemainingDays,
    bool IsExpired);

public static class PackageSubscriptionPricing
{
    public static PackageSubscriptionPricingResult Calculate(
        UserPackage? currentSubscription,
        Package targetPackage,
        DateTime utcNow)
    {
        var packagePrice = targetPackage.Price;

        if (currentSubscription is null || currentSubscription.EndDateUtc <= utcNow)
        {
            return new PackageSubscriptionPricingResult(
                packagePrice,
                0,
                packagePrice,
                0,
                true);
        }

        var durationDays = currentSubscription.Package.DurationInDays;
        if (durationDays <= 0)
        {
            durationDays = 1;
        }

        var remainingDays = Math.Max(0, (int)Math.Ceiling((currentSubscription.EndDateUtc - utcNow).TotalDays));
        var dailyRate = currentSubscription.AmountPaid / durationDays;
        var adjustmentAmount = Math.Round(dailyRate * remainingDays, 2, MidpointRounding.AwayFromZero);
        var amountPaid = Math.Max(0, Math.Round(packagePrice - adjustmentAmount, 2, MidpointRounding.AwayFromZero));

        return new PackageSubscriptionPricingResult(
            packagePrice,
            adjustmentAmount,
            amountPaid,
            remainingDays,
            false);
    }
}
