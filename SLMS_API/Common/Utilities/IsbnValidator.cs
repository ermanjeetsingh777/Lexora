using System.Text.RegularExpressions;

namespace SLMS_API.Common.Utilities;

public static class IsbnValidator
{
    public static bool IsValid(string? raw) => Canonicalize(raw) is not null;

    public static string Normalize(string? raw) => Canonicalize(raw) ?? Clean(raw);

    private static string? Canonicalize(string? raw)
    {
        var value = Clean(raw);
        if (value.Length == 13 && IsValidIsbn13(value)) return value;

        if (value.Length == 10)
        {
            if (IsValidIsbn10(value)) return Isbn10ToIsbn13(value);

            var asIsbn13 = "978" + value;
            if (IsValidIsbn13(asIsbn13)) return asIsbn13;
        }

        return null;
    }

    private static string Clean(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var value = Regex.Replace(raw.Trim(), @"^ISBN[-\s]?(10|13)?:?\s*", "", RegexOptions.IgnoreCase);
        value = Regex.Replace(value, @"[^0-9X]", "", RegexOptions.IgnoreCase).ToUpperInvariant();
        return value;
    }

    private static bool IsValidIsbn10(string value)
    {
        if (!Regex.IsMatch(value, @"^\d{9}[\dX]$")) return false;
        var sum = 0;
        for (var i = 0; i < 9; i++)
        {
            sum += (value[i] - '0') * (10 - i);
        }
        var check = value[9] == 'X' ? 10 : value[9] - '0';
        return (sum + check) % 11 == 0;
    }

    private static bool IsValidIsbn13(string value)
    {
        if (!Regex.IsMatch(value, @"^\d{13}$")) return false;
        var sum = 0;
        for (var i = 0; i < 12; i++)
        {
            var digit = value[i] - '0';
            sum += digit * (i % 2 == 0 ? 1 : 3);
        }
        var check = (10 - (sum % 10)) % 10;
        return check == (value[12] - '0');
    }

    private static string Isbn10ToIsbn13(string isbn10)
    {
        var core = "978" + isbn10[..9];
        var sum = 0;
        for (var i = 0; i < 12; i++)
        {
            sum += (core[i] - '0') * (i % 2 == 0 ? 1 : 3);
        }
        var check = (10 - (sum % 10)) % 10;
        return core + check;
    }
}
