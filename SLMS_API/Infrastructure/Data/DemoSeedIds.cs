namespace SLMS_API.Infrastructure.Data;

/// <summary>Stable identifiers for demo seed data (idempotent re-runs).</summary>
public static class DemoSeedIds
{
    public static readonly Guid InstitutionId = Guid.Parse("d0000001-0000-4000-8000-000000000001");

    public static readonly Guid BranchCentralId = Guid.Parse("d0000002-0000-4000-8000-000000000001");
    public static readonly Guid BranchNorthId = Guid.Parse("d0000002-0000-4000-8000-000000000002");

    public static readonly Guid LibraryCentralReadingId = Guid.Parse("d0000003-0000-4000-8000-000000000001");
    public static readonly Guid LibraryCentralStudyId = Guid.Parse("d0000003-0000-4000-8000-000000000002");
    public static readonly Guid LibraryNorthReadingId = Guid.Parse("d0000003-0000-4000-8000-000000000003");
    public static readonly Guid LibraryNorthStudyId = Guid.Parse("d0000003-0000-4000-8000-000000000004");

    public static readonly Guid PlanCentralReadingMonthlyId = Guid.Parse("d0000005-0000-4000-8000-000000000001");
    public static readonly Guid PlanCentralReadingQuarterlyId = Guid.Parse("d0000005-0000-4000-8000-000000000002");
    public static readonly Guid PlanCentralStudyMonthlyId = Guid.Parse("d0000005-0000-4000-8000-000000000003");
    public static readonly Guid PlanCentralStudyQuarterlyId = Guid.Parse("d0000005-0000-4000-8000-000000000004");
    public static readonly Guid PlanNorthReadingMonthlyId = Guid.Parse("d0000005-0000-4000-8000-000000000005");
    public static readonly Guid PlanNorthReadingQuarterlyId = Guid.Parse("d0000005-0000-4000-8000-000000000006");
    public static readonly Guid PlanNorthStudyMonthlyId = Guid.Parse("d0000005-0000-4000-8000-000000000007");
    public static readonly Guid PlanNorthStudyQuarterlyId = Guid.Parse("d0000005-0000-4000-8000-000000000008");

    public static readonly Guid SupportTicketOpenId = Guid.Parse("d0000006-0000-4000-8000-000000000001");
    public static readonly Guid SupportTicketResolvedId = Guid.Parse("d0000006-0000-4000-8000-000000000002");
    public static readonly Guid SystemIncidentId = Guid.Parse("d0000007-0000-4000-8000-000000000001");

    public static readonly Guid TrialPackageId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public static Guid MemberId(int index) =>
        Guid.Parse($"d0000010-0000-4000-8000-{index:D12}");

    private static int LibraryKey(Guid libraryId) => libraryId switch
    {
        _ when libraryId == LibraryCentralReadingId => 1,
        _ when libraryId == LibraryCentralStudyId => 2,
        _ when libraryId == LibraryNorthReadingId => 3,
        _ when libraryId == LibraryNorthStudyId => 4,
        _ => throw new ArgumentOutOfRangeException(nameof(libraryId), libraryId, "Unknown demo library id."),
    };

    public static Guid SeatId(Guid libraryId, int seatNumber) =>
        Guid.Parse($"d0000020-0000-4000-8000-{LibraryKey(libraryId):D4}{seatNumber:D8}");

    public static Guid BookId(Guid libraryId, int bookIndex) =>
        Guid.Parse($"d0000030-0000-4000-8000-{LibraryKey(libraryId):D4}{bookIndex:D8}");

    public static Guid AttendanceId(int memberIndex, int dayOffset) =>
        Guid.Parse($"d0000060-0000-4000-8000-{memberIndex:D4}{dayOffset:D8}");

    public static Guid BookAuditId(Guid libraryId, int bookIndex) =>
        Guid.Parse($"d0000050-0000-4000-8000-{LibraryKey(libraryId):D4}{bookIndex:D8}");
}
