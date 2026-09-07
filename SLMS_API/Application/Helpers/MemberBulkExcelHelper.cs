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
    /// <summary>Optional amount paid. Null = full plan price.</summary>
    public decimal? PaidAmount { get; init; }
    public string? RawPaidAmount { get; init; }
    /// <summary>Optional manual due. Null/blank = 0 (shortfall becomes Adjustment).</summary>
    public decimal? DueAmount { get; init; }
    public string? RawDueAmount { get; init; }
}

public static class MemberBulkExcelHelper
{
    private const string MembersSheetName = "Members";
    private const string PlansSheetName = "Plans";
    private const int TemplateDataRows = 200;

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

    // Column order in template (1-based):
    // 1 FullName, 2 Email, 3 PhoneNumber, 4 DateOfBirth, 5 Gender, 6 Shift,
    // 7 PlanName, 8 PlanAmount (auto), 9 PaidAmount, 10 DueAmount, 11 AdjustmentAmount (auto),
    // 12 MembershipNo, 13 PlanStartDate, 14 PlanEndDate
    private static readonly string[] Headers =
    [
        "FullName",
        "Email",
        "PhoneNumber",
        "DateOfBirth",
        "Gender",
        "Shift",
        "PlanName",
        "PlanAmount",
        "PaidAmount",
        "DueAmount",
        "AdjustmentAmount",
        "MembershipNo",
        "PlanStartDate",
        "PlanEndDate"
    ];

    private static readonly Dictionary<string, string> HeaderAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["FullName"] = "FullName",
        ["Email"] = "Email",
        ["PhoneNumber"] = "PhoneNumber",
        ["DateOfBirth"] = "DateOfBirth",
        ["Gender"] = "Gender",
        ["Shift"] = "Shift",
        ["PlanName"] = "PlanName",
        ["PlanAmount"] = "PlanAmount",
        ["PaidAmount"] = "PaidAmount",
        ["DueAmount"] = "DueAmount",
        ["AdjustmentAmount"] = "AdjustmentAmount",
        ["Adjustment"] = "AdjustmentAmount",
        ["MembershipNo"] = "MembershipNo",
        ["MemberId"] = "MembershipNo",
        ["MemberID"] = "MembershipNo",
        ["PlanStartDate"] = "PlanStartDate",
        ["PlanEndDate"] = "PlanEndDate",
    };

    public static byte[] GenerateTemplate(IEnumerable<(string Name, int DurationInDays, decimal Price)> plans)
    {
        var planList = plans.ToList();
        using var workbook = new XLWorkbook();

        var plansSheet = workbook.Worksheets.Add(PlansSheetName);
        plansSheet.Cell(1, 1).Value = "PlanName";
        plansSheet.Cell(1, 2).Value = "DurationInDays";
        plansSheet.Cell(1, 3).Value = "Price";
        plansSheet.Range(1, 1, 1, 3).Style.Font.Bold = true;

        var planRow = 2;
        foreach (var plan in planList)
        {
            plansSheet.Cell(planRow, 1).Value = plan.Name;
            plansSheet.Cell(planRow, 2).Value = plan.DurationInDays;
            plansSheet.Cell(planRow, 3).Value = plan.Price;
            planRow++;
        }

        if (planRow == 2)
        {
            plansSheet.Cell(2, 1).Value = "Monthly";
            plansSheet.Cell(2, 2).Value = 30;
            plansSheet.Cell(2, 3).Value = 0;
            planRow = 3;
        }

        var lastPlanRow = planRow - 1;
        plansSheet.Columns().AdjustToContents();

        var listsSheet = workbook.Worksheets.Add("Lists");
        listsSheet.Cell(1, 1).Value = "Gender";
        listsSheet.Cell(2, 1).Value = "Male";
        listsSheet.Cell(3, 1).Value = "Female";
        listsSheet.Cell(4, 1).Value = "Other";
        listsSheet.Cell(1, 2).Value = "Shift";
        listsSheet.Cell(2, 2).Value = "Morning";
        listsSheet.Cell(3, 2).Value = "Afternoon";
        listsSheet.Cell(4, 2).Value = "Evening";
        listsSheet.Cell(5, 2).Value = "Night";
        listsSheet.Cell(6, 2).Value = "Full";
        listsSheet.Cell(7, 2).Value = "General";
        listsSheet.Visibility = XLWorksheetVisibility.Hidden;

        var membersSheet = workbook.Worksheets.Add(MembersSheetName);
        for (var i = 0; i < Headers.Length; i++)
        {
            membersSheet.Cell(1, i + 1).Value = Headers[i];
            membersSheet.Cell(1, i + 1).Style.Font.Bold = true;
        }

        var samplePlan = planList.FirstOrDefault();
        var samplePlanName = string.IsNullOrWhiteSpace(samplePlan.Name) ? "Monthly" : samplePlan.Name;
        var samplePrice = samplePlan.Price;
        var sampleDuration = samplePlan.DurationInDays > 0 ? samplePlan.DurationInDays : 30;
        var today = DateTime.UtcNow.Date;

        membersSheet.Cell(2, 1).Value = "John Doe";
        membersSheet.Cell(2, 2).Value = "john.doe@example.com";
        membersSheet.Cell(2, 3).Value = "9876543210";
        membersSheet.Cell(2, 4).Value = "2000-01-15";
        membersSheet.Cell(2, 5).Value = "Male";
        membersSheet.Cell(2, 6).Value = "General";
        membersSheet.Cell(2, 7).Value = samplePlanName;
        membersSheet.Cell(2, 9).Value = samplePrice;
        membersSheet.Cell(2, 10).Value = 0;
        membersSheet.Cell(2, 12).Value = "LIB-00001";
        membersSheet.Cell(2, 13).Value = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        membersSheet.Cell(2, 14).Value = today.AddDays(sampleDuration).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        // PlanAmount = VLOOKUP from Plans; Adjustment = Plan − Paid − Due (Paid blank → full plan)
        for (var r = 2; r <= TemplateDataRows + 1; r++)
        {
            membersSheet.Cell(r, 8).FormulaA1 =
                $"IFERROR(VLOOKUP(G{r},{PlansSheetName}!$A$2:$C${lastPlanRow},3,FALSE),\"\")";
            membersSheet.Cell(r, 11).FormulaA1 =
                $"IFERROR(MAX(0,N(H{r})-IF(I{r}=\"\",N(H{r}),N(I{r}))-IF(J{r}=\"\",0,N(J{r}))),\"\")";
        }

        membersSheet.Range(2, 8, TemplateDataRows + 1, 8).Style.Fill.BackgroundColor = XLColor.FromHtml("#F3F4F6");
        membersSheet.Range(2, 11, TemplateDataRows + 1, 11).Style.Fill.BackgroundColor = XLColor.FromHtml("#F3F4F6");

        var planDv = membersSheet.Range(2, 7, TemplateDataRows + 1, 7).CreateDataValidation();
        planDv.AllowedValues = XLAllowedValues.List;
        planDv.List(plansSheet.Range(2, 1, lastPlanRow, 1));
        planDv.IgnoreBlanks = true;
        planDv.InCellDropdown = true;
        planDv.ShowErrorMessage = true;
        planDv.ErrorTitle = "Invalid plan";
        planDv.ErrorMessage = "Select a plan from the dropdown (Plans sheet).";

        var genderDv = membersSheet.Range(2, 5, TemplateDataRows + 1, 5).CreateDataValidation();
        genderDv.AllowedValues = XLAllowedValues.List;
        genderDv.List(listsSheet.Range(2, 1, 4, 1));
        genderDv.IgnoreBlanks = true;
        genderDv.InCellDropdown = true;

        var shiftDv = membersSheet.Range(2, 6, TemplateDataRows + 1, 6).CreateDataValidation();
        shiftDv.AllowedValues = XLAllowedValues.List;
        shiftDv.List(listsSheet.Range(2, 2, 7, 2));
        shiftDv.IgnoreBlanks = true;
        shiftDv.InCellDropdown = true;

        membersSheet.Columns().AdjustToContents();
        membersSheet.SheetView.FreezeRows(1);

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
            ("Gender", "Yes", "Use dropdown: Male, Female, or Other."),
            ("Shift", "Yes", "Use dropdown: Morning, Afternoon, Evening, Night, Full, or General."),
            ("PlanName", "Yes", "Use dropdown — plans listed on the Plans sheet."),
            ("PlanAmount", "Auto", "Auto-filled from selected PlanName (do not edit)."),
            ("PaidAmount", "No", "Amount actually paid. Blank = full plan amount."),
            ("DueAmount", "No", "Manual collectible due. Blank = 0. Shortfall without due becomes Adjustment."),
            ("AdjustmentAmount", "Auto", "Auto: PlanAmount − Paid − Due (discount / waived, not collectible)."),
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

        // Put Members first for user-friendliness
        membersSheet.Position = 1;
        instructionsSheet.Position = 2;
        plansSheet.Position = 3;

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
                    "Invalid template. Required: FullName, PhoneNumber, Gender, Shift, PlanName. Optional: Email, DateOfBirth, MembershipNo, PlanStartDate, PlanEndDate, PaidAmount, DueAmount. PlanAmount/AdjustmentAmount are auto columns.");
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
            var paidText = GetMappedText(worksheet, rowNumber, columnMap, "PaidAmount");
            var dueText = GetMappedText(worksheet, rowNumber, columnMap, "DueAmount");

            if (IsEmptyRow(fullName, email, phone, dobText, gender, shift, planName, membershipNo, planStartText, planEndText, paidText, dueText))
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
                RawPlanEndDate = planEndText,
                PaidAmount = ParseDecimalCell(worksheet, rowNumber, columnMap, "PaidAmount", paidText),
                RawPaidAmount = paidText,
                DueAmount = ParseDecimalCell(worksheet, rowNumber, columnMap, "DueAmount", dueText),
                RawDueAmount = dueText
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

        if (!string.IsNullOrWhiteSpace(row.RawPaidAmount) && row.PaidAmount is null)
            return "PaidAmount must be a valid number.";

        if (!string.IsNullOrWhiteSpace(row.RawDueAmount) && row.DueAmount is null)
            return "DueAmount must be a valid number.";

        if (row.PaidAmount.HasValue && row.PaidAmount.Value < 0)
            return "PaidAmount cannot be negative.";

        if (row.DueAmount.HasValue && row.DueAmount.Value < 0)
            return "DueAmount cannot be negative.";

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

    private static decimal? ParseDecimalCell(
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
        if (cell.DataType == XLDataType.Number)
        {
            return Convert.ToDecimal(cell.GetDouble(), CultureInfo.InvariantCulture);
        }

        if (cell.HasFormula)
        {
            try
            {
                if (cell.CachedValue.IsNumber)
                {
                    return Convert.ToDecimal(cell.CachedValue.GetNumber(), CultureInfo.InvariantCulture);
                }
            }
            catch
            {
                // fall through
            }
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.CurrentCulture, out parsed))
        {
            return parsed;
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

        if (cell.DataType == XLDataType.Number)
        {
            return cell.GetDouble().ToString(CultureInfo.InvariantCulture);
        }

        // Cached formula result (PlanAmount / AdjustmentAmount)
        if (cell.HasFormula)
        {
            try
            {
                if (cell.CachedValue.IsNumber)
                {
                    return cell.CachedValue.GetNumber().ToString(CultureInfo.InvariantCulture);
                }

                if (cell.CachedValue.IsText)
                {
                    return cell.CachedValue.GetText().Trim();
                }
            }
            catch
            {
                // ignore
            }
        }

        return cell.GetString().Trim();
    }

    private static bool IsEmptyRow(params string[] values) =>
        values.All(string.IsNullOrWhiteSpace);
}
