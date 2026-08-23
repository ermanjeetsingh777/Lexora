using System.Globalization;
using System.Text.RegularExpressions;
using ClosedXML.Excel;

namespace SLMS_API.Application.Helpers;

public sealed class BulkMemberExcelRow
{
    public int RowNumber { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public DateTime? DateOfBirth { get; init; }
    public string Gender { get; init; } = string.Empty;
    public string Shift { get; init; } = string.Empty;
    public string PlanName { get; init; } = string.Empty;
}

public static class MemberBulkExcelHelper
{
    private const string MembersSheetName = "Members";
    private static readonly Regex PhoneRegex = new(@"^[6-9]\d{9}$", RegexOptions.Compiled);
    private static readonly HashSet<string> ValidGenders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Male", "Female", "Other"
    };
    private static readonly HashSet<string> ValidShifts = new(StringComparer.OrdinalIgnoreCase)
    {
        "Morning", "Afternoon", "Evening", "Night", "Full", "General"
    };

    private static readonly string[] Headers =
    [
        "FullName",
        "Email",
        "PhoneNumber",
        "DateOfBirth",
        "Gender",
        "Shift",
        "PlanName"
    ];

    public static byte[] GenerateTemplate(IEnumerable<(string Name, int DurationInDays, decimal Price)> plans)
    {
        using var workbook = new XLWorkbook();

        var membersSheet = workbook.Worksheets.Add(MembersSheetName);
        for (var i = 0; i < Headers.Length; i++)
        {
            membersSheet.Cell(1, i + 1).Value = Headers[i];
            membersSheet.Cell(1, i + 1).Style.Font.Bold = true;
        }

        membersSheet.Cell(2, 1).Value = "John Doe";
        membersSheet.Cell(2, 2).Value = "john.doe@example.com";
        membersSheet.Cell(2, 3).Value = "9876543210";
        membersSheet.Cell(2, 4).Value = "2000-01-15";
        membersSheet.Cell(2, 5).Value = "Male";
        membersSheet.Cell(2, 6).Value = "General";
        membersSheet.Cell(2, 7).Value = plans.FirstOrDefault().Name ?? "Monthly";
        membersSheet.Columns().AdjustToContents();

        var instructionsSheet = workbook.Worksheets.Add("Instructions");
        instructionsSheet.Cell(1, 1).Value = "Column";
        instructionsSheet.Cell(1, 2).Value = "Required";
        instructionsSheet.Cell(1, 3).Value = "Description";
        instructionsSheet.Range(1, 1, 1, 3).Style.Font.Bold = true;

        var instructions = new (string Column, string Required, string Description)[]
        {
            ("FullName", "Yes", "Member full name (2–100 characters)."),
            ("Email", "Yes", "Unique email address; used as login username."),
            ("PhoneNumber", "Yes", "10-digit Indian mobile number starting with 6–9."),
            ("DateOfBirth", "Yes", "Date in yyyy-MM-dd format."),
            ("Gender", "Yes", "Male, Female, or Other."),
            ("Shift", "Yes", "Morning, Afternoon, Evening, Night, Full, or General."),
            ("PlanName", "Yes", "Must match an active plan name for the selected library (see Plans sheet).")
        };

        for (var i = 0; i < instructions.Length; i++)
        {
            var row = i + 2;
            instructionsSheet.Cell(row, 1).Value = instructions[i].Column;
            instructionsSheet.Cell(row, 2).Value = instructions[i].Required;
            instructionsSheet.Cell(row, 3).Value = instructions[i].Description;
        }
        instructionsSheet.Columns().AdjustToContents();

        var plansSheet = workbook.Worksheets.Add("Plans");
        plansSheet.Cell(1, 1).Value = "PlanName";
        plansSheet.Cell(1, 2).Value = "DurationInDays";
        plansSheet.Cell(1, 3).Value = "Price";
        plansSheet.Range(1, 1, 1, 3).Style.Font.Bold = true;

        var planRow = 2;
        foreach (var plan in plans)
        {
            plansSheet.Cell(planRow, 1).Value = plan.Name;
            plansSheet.Cell(planRow, 2).Value = plan.DurationInDays;
            plansSheet.Cell(planRow, 3).Value = plan.Price;
            planRow++;
        }
        plansSheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public static IReadOnlyList<BulkMemberExcelRow> Parse(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheets.FirstOrDefault(x =>
            string.Equals(x.Name, MembersSheetName, StringComparison.OrdinalIgnoreCase))
            ?? workbook.Worksheets.First();

        var rows = new List<BulkMemberExcelRow>();
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++)
        {
            var fullName = GetCellText(worksheet, rowNumber, 1);
            var email = GetCellText(worksheet, rowNumber, 2);
            var phone = GetCellText(worksheet, rowNumber, 3);
            var dobText = GetCellText(worksheet, rowNumber, 4);
            var gender = GetCellText(worksheet, rowNumber, 5);
            var shift = GetCellText(worksheet, rowNumber, 6);
            var planName = GetCellText(worksheet, rowNumber, 7);

            if (IsEmptyRow(fullName, email, phone, dobText, gender, shift, planName))
            {
                continue;
            }

            rows.Add(new BulkMemberExcelRow
            {
                RowNumber = rowNumber,
                FullName = fullName,
                Email = email,
                PhoneNumber = phone,
                DateOfBirth = ParseDateOfBirth(worksheet, rowNumber, dobText),
                Gender = gender,
                Shift = shift,
                PlanName = planName
            });
        }

        return rows;
    }

    public static string? ValidateRow(BulkMemberExcelRow row)
    {
        if (string.IsNullOrWhiteSpace(row.FullName))
            return "FullName is required.";
        if (row.FullName.Trim().Length < 2 || row.FullName.Trim().Length > 100)
            return "FullName must be between 2 and 100 characters.";

        if (string.IsNullOrWhiteSpace(row.Email))
            return "Email is required.";
        if (!row.Email.Contains('@') || row.Email.Length > 150)
            return "Email is invalid.";

        if (string.IsNullOrWhiteSpace(row.PhoneNumber))
            return "PhoneNumber is required.";
        if (!PhoneRegex.IsMatch(row.PhoneNumber.Trim()))
            return "PhoneNumber must be a valid 10-digit mobile number starting with 6–9.";

        if (row.DateOfBirth is null)
            return "DateOfBirth is required and must be in yyyy-MM-dd format.";

        if (string.IsNullOrWhiteSpace(row.Gender))
            return "Gender is required.";
        if (!ValidGenders.Contains(row.Gender.Trim()))
            return "Gender must be Male, Female, or Other.";

        if (string.IsNullOrWhiteSpace(row.Shift))
            return "Shift is required.";
        if (!ValidShifts.Contains(row.Shift.Trim()))
            return "Shift must be Morning, Afternoon, Evening, Night, Full, or General.";

        if (string.IsNullOrWhiteSpace(row.PlanName))
            return "PlanName is required.";

        return null;
    }

    private static string GetCellText(IXLWorksheet worksheet, int row, int column)
    {
        var cell = worksheet.Cell(row, column);
        if (cell.DataType == XLDataType.DateTime)
        {
            return cell.GetDateTime().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        return cell.GetString().Trim();
    }

    private static DateTime? ParseDateOfBirth(IXLWorksheet worksheet, int rowNumber, string dobText)
    {
        var cell = worksheet.Cell(rowNumber, 4);
        if (cell.DataType == XLDataType.DateTime)
        {
            return cell.GetDateTime().Date;
        }

        if (DateTime.TryParseExact(dobText, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            return parsed.Date;
        }

        if (DateTime.TryParse(dobText, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
        {
            return parsed.Date;
        }

        return null;
    }

    private static bool IsEmptyRow(params string[] values) =>
        values.All(string.IsNullOrWhiteSpace);
}
