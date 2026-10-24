/** `2026-09-20` → `{ day: '20', monthYear: '09/2026' }` cho ô ngày ở danh sách. */
export function dateParts(isoDate: string): { day: string; monthYear: string } {
  const [y = '', m = '', d = ''] = isoDate.split('-');
  return { day: d, monthYear: `${m}/${y}` };
}

/** `2026-09-20` → `20/09/2026` */
export function formatVisitDate(isoDate: string): string {
  const [y = '', m = '', d = ''] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** Thời điểm ISO → `20/09/2026 18:40` theo múi giờ tài khoản. */
export function formatDateTime(iso: string, timeZone: string | undefined): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
  } catch {
    return iso;
  }
}

/** Đếm ký tự như server: code point sau NFC. */
export const countChars = (s: string): number => Array.from(s.normalize('NFC')).length;

export const VISIT_TEXT_MAX = 2000;
