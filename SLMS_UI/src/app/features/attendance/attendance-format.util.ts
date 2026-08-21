export function formatAttendanceDisplayTime(
  utcValue?: string | Date | null,
  timeOnlyValue?: string | null,
): string {
  if (utcValue) {
    const parsed = utcValue instanceof Date ? utcValue : new Date(utcValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }

  if (timeOnlyValue && /^\d{2}:\d{2}/.test(timeOnlyValue)) {
    return timeOnlyValue.slice(0, 5);
  }

  return '—';
}

export function attendanceTimeInputValue(
  utcValue?: string | Date | null,
  timeOnlyValue?: string | null,
): string {
  const formatted = formatAttendanceDisplayTime(utcValue, timeOnlyValue);
  return formatted === '—' ? '' : formatted;
}

export function localTimeInputToUtcTimeOnly(localTime: string, referenceDate = new Date()): string | null {
  if (!/^\d{2}:\d{2}/.test(localTime)) return null;
  const [hours, minutes] = localTime.split(':').map(Number);
  const local = new Date(referenceDate);
  local.setHours(hours, minutes, 0, 0);
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}:00`;
}
