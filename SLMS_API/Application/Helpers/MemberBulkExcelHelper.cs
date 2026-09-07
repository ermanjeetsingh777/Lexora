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
    public string? RawDateOfBirth { get; init; }
    public string Gender { get; init; } = string.Empty;
    public string Shift { get; init; } = string.Empty;
    public string PlanName { get; init; } = string.Empty;
    /// <summary>Optional custom member ID (unique per library).</summary>
    public string? MembershipNo { get; init; }
    public DateTime? PlanStartDate { get; init; }
    public string? RawPlanStartDate { get; init; }
    public DateTime? PlanEndDate { get; init; }
    public string? RawPlanEndDate { get; init; }
}

public static class MemberBulkExcelHelper
{
    private const string MembersSheetName = "Members";
    private static readonly Regex PhoneRegex = new(@"^[6-9]\d{9}$", RegexOptions.Compiled);
    private static readonly Regex MembershipNoRegex = new(@"^[A-Za-z0-9][A-Za-z0-9._\-]*$", RegexOptions.Compiled);
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
        "PlanName",
        "MembershipNo",
        "PlanStartDate",
        "PlanEndDate"
    ];

    private static readonly Dictionary<string, string> HeaderAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["fullnameName"] = "FullName",
        ["Email"] = "Email",
        ["PhoneNumber"] = "PhoneNumber",
        ["DateOfBirth"] = "DateOfBirth",
        ["Gender"] = "Gender",
        ["Shift"] = "Shift",
        ["PlanName"] = "PlanName",
        ["MembershipNo"] = "MembershipNo",
        ["MemberId"] = "MembershipNo",
        ["MemberID"] = "MembershipNo",
        ["PlanStartDate"] = "PlanStartDate",
        ["PlanEndDate"] = "PlanEndDate",
    };

    public static byte[] GenerateTemplate(IEnumerable<(string Name, int DurationInDays, decimal Price)> plans)
    {
        using var workbook = new XLWorkbook();

        var membersSheet = workbook.Worksheets.Add(MembersSheetName);
        for (var i = 0; i < Headers.Length; i++)
        {
            membersSheet.Cell(1, i + 1).Value = Headers[i];
            membersSheet.Cell(1, i + 1).Style.Font.Bold = true;
        }

        var samplePlan = plans.FirstOrDefault().Name ?? "Monthly";
        var today = DateTime.UtcNow.Date;
        membersSheet.Cell(2, 1).Value = "John Doe";
        membersSheet.Cell(2, 2).Value = "john.doe@example.com";
        membersSheet.Cell(2, 3).Value = "9876543210";
        membersSheet.Cell(2, 4).Value = "2000-01-15";
        membersSheet.Cell(2, 5).Value = "Male";
        membersSheet.Cell(2, 6).Value = "General";
        membersSheet.Cell(2, 7).Value = samplePlan;
        membersSheet.Cell(2, 8).Value = "LIB-00001";
        membersSheet.Cell(2, 9).Value = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        membersSheet.Cell(2, 10).Value = today.AddDays(30).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        membersSheet.Columns().AdjustToContents();

        var instructionsSheet = workbook.Worksheets.Add("Instructions");
        instructionsSheet.Cell(1, 1).Value = "Column";
        instructionsSheet.Cell(1, 2).Value = "Required";
        instructionsSheet.Cell(1, 3).Value = "Description";
        instructionsSheet.Range(1, 1, 1, 3).Style.Font.Bold = true;

        var instructions = new (string Column, string Required, string Description)[]
        {
            ("FullName", "Yes", "Member full name (2–100 characters)."),
            ("Email", "No", "Email address (optional). If provided, used for login and notifications."),
            ("PhoneNumber", "Yes", "10-digit Indian mobile number starting with 6–9 (required)."),
            ("DateOfBirth", "No", "Date in yyyy-MM-dd format (optional)."),
            ("Gender", "Yes", "Male, Female, or Other."),
            ("Shift", "Yes", "Morning, Afternoon, Evening, Night, Full, or General."),
            ("PlanName", "Yes", "Must match an active plan name for the selected library (see Plans sheet)."),
            ("MembershipNo", "No", "Optional custom Member ID (unique in this library). Leave blank to auto-generate."),
            ("PlanStartDate", "No", "Optional plan start (yyyy-MM-dd). Default = today."),
            ("PlanEndDate", "No", "Optional plan end (yyyy-MM-dd). Default = start + plan duration. Must be after start.")
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

        var headerRow = worksheet.Row(1);
        var lastColumn = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 0;
        var columnMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        for (var col = 1; col <= lastColumn; col++)
        {
            var headerText = NormalizeHeader(headerRow.Cell(col).GetString());
            if (HeaderAliases.TryGetValue(headerText, out var canonical) && !columnMap.ContainsKey(canonical))
            {
                columnMap[canonical] = col;
            }
        }

        string[] required = ["FullName", "PhoneNumber", "Gender", "Shift", "PlanName"];
        foreach (var key in required)
        {
            if (!columnMap.ContainsKey(key))
            {
                throw new InvalidOperationException(
                    "Invalid template. Required columns: FullName, Email, PhoneNumber, DateOfBirth, Gender, Shift, PlanName. Optional: MembershipNo, PlanStartDate, PlanEndDate.");
            }
        }

        var rows = new List<BulkMemberExcelRow>();
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++)
        {
            var fullName = GetMappedText(worksheet, rowNumber, columnMap, "FullName");
            var email = GetMappedText(worksheet, rowNumber, columnMap, "Email");
            var phone = GetMappedText(worksheet, rowNumber, columnMap, "PhoneNumber");
            var dobText = GetMappedText(worksheet, rowNumber, columnMap, "DateOfBirth");
            var gender = GetMappedText(worksheet, rowNumber, columnMap, "Gender");
            var shift = GetMappedText(worksheet, rowNumber, columnMap, "Shift");
            var planName = GetMappedText(worksheet, rowNumber, columnMap, "PlanName");
            var membershipNo = GetMappedText(worksheet, rowNumber, columnMap, "MembershipNo");
            var planStartText = GetMappedText(worksheet, rowNumber, columnMap, "PlanStartDate");
            var planEndText = GetMappedText(worksheet, rowNumber, columnMap, "PlanEndDate");

            if (IsEmptyRow(fullName, email, phone, dobText, gender, shift, planName, membershipNo, planStartText, planEndText))
            {
                continue;
            }

            rows.Add(new BulkMemberExcelRow
            {
                RowNumber = rowNumber,
                FullName = fullName,
                Email = email,
                PhoneNumber = phone,
                DateOfBirth = ParseDateCell(worksheet, rowNumber, columnMap, "DateOfBirth", dobText),
                RawDateOfBirth = dobText,
                Gender = gender,
                Shift = shift,
                PlanName = planName,
                MembershipNo = string.IsNullOrWhiteSpace(membershipNo) ? null : membershipNo.Trim(),
                PlanStartDate = ParseDateCell(worksheet, rowNumber, columnMap, "PlanStartDate", planStartText),
                RawPlanStartDate = planStartText,
                PlanEndDate = ParseDateCell(worksheet, rowNumber, columnMap, "PlanEndDate", planEndText),
                RawPlanEndDate = planEndText
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

        if (!string.IsNullOrWhiteSpace(row.Email))
        {
            var email = row.Email.Trim();
            if (!email.Contains('@') || email.Length > 150)
                return "Email is invalid.";
        }

        if (string.IsNullOrWhiteSpace(row.PhoneNumber))
            return "PhoneNumber is required.";
        if (!PhoneRegex.IsMatch(row.PhoneNumber.Trim()))
            return "PhoneNumber must be a valid 10-digit mobile number starting with 6–9.";

        if (!string.IsNullOrWhiteSpace(row.RawDateOfBirth) && row.DateOfBirth is null)
            return "DateOfBirth must be in yyyy-MM-dd format.";

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

        if (!string.IsNullOrWhiteSpace(row.MembershipNo))
        {
            var membershipNo = row.MembershipNo.Trim();
            if (membershipNo.Length > 40)
                return "MembershipNo must be 40 characters or fewer.";
            if (!MembershipNoRegex.IsMatch(membershipNo))
                return "MembershipNo must start with a letter or digit and may contain letters, digits, '.', '_' or '-'.";
        }

        if (!string.IsNullOrWhiteSpace(row.RawPlanStartDate) && row.PlanStartDate is null)
            return "PlanStartDate must be in yyyy-MM-dd format.";

        if (!string.IsNullOrWhiteSpace(row.RawPlanEndDate) && row.PlanEndDate is null)
            return "PlanEndDate must be in yyyy-MM-dd format.";

        if (row.PlanStartDate.HasValue && row.PlanEndDate.HasValue && row.PlanEndDate.Value.Date <= row.PlanStartDate.Value.Date)
            return "PlanEndDate must be after PlanStartDate.";

        return null;
    }

    private static string NormalizeHeader(string value) =>
        Regex.Replace(value.Trim(), @"\s+", "");

    private static string GetMappedText(
        IXLWorksheet worksheet,
        int row,
        IReadOnlyDictionary<string, int> columnMap,
        string field)
    {
        if (!columnMap.TryGetValue(field, out var column))
        {
            return string.Empty;
        }

        return GetCellText(worksheet, row, column);
    }

    private static DateTime? ParseDateCell(
        IXLWorksheet worksheet,
        int rowNumber,
        IReadOnlyDictionary<string, int> columnMap,
        string field,
        string text)
    {
        if (!columnMap.TryGetValue(field, out var column))
        {
            return null;
        }

        var cell = worksheet.Cell(rowNumber, column);
        if (cell.DataType == XLDataType.DateTime)
        {
            return cell.GetDateTime().Date;
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (DateTime.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            return parsed.Date;
        }

        if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
        {
            return parsed.Date;
        }

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

    private static bool IsEmptyRow(params string[] values) =>
        values.All(string.IsNullOrWhiteSpace);
}
