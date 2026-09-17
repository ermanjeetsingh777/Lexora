/**
 * Extract a member attendance QR token from a raw scan (URL, path, or bare token).
 */
export function extractMemberAttendanceToken(raw: string): string | null {
  const cleaned = (raw || '').trim();
  if (!cleaned) return null;

  try {
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      const parsed = new URL(cleaned);
      const token = parsed.searchParams.get('token');
      if (token && (parsed.pathname.includes('/kiosk/attendance/member') || parsed.pathname.includes('/member'))) {
        return token;
      }
      // Member ID cards always use ?token= on the member kiosk URL
      if (token && cleaned.includes('attendance')) return token;
      if (token) return token;
    }
  } catch {
    /* fall through */
  }

  if (cleaned.startsWith('/kiosk/') || cleaned.startsWith('kiosk/')) {
    try {
      const url = new URL(cleaned.startsWith('/') ? cleaned : `/${cleaned}`, window.location.origin);
      return url.searchParams.get('token');
    } catch {
      return null;
    }
  }

  // Bare hex/guid-like token (AttendanceQrToken is Guid "N" = 32 hex chars)
  if (/^[a-f0-9]{32}$/i.test(cleaned) || (cleaned.length >= 16 && !cleaned.includes(' ') && !cleaned.includes('/'))) {
    return cleaned;
  }

  return null;
}
