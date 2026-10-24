import { vi } from '../../i18n/vi';

/** `YYYY-MM-DD` − 1 ngày (lịch, UTC). */
function previousDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** `2026-11-10` → `10/11/2026` */
export function formatDate(isoDate: string): string {
  const [y = '', m = '', d = ''] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Nhóm theo `appearOn` so với `today` của API (client không tự tính "hôm nay"): HÔM NAY, HÔM QUA,
 * hoặc `dd/MM/yyyy`. Giữ thứ tự của danh sách (mới nhất trước).
 */
export function groupByDay<T extends { appearOn: string }>(
  items: T[],
  today: string,
): { label: string; items: T[] }[] {
  const yesterday = previousDay(today);
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.key === item.appearOn) {
      last.items.push(item);
      continue;
    }
    const label =
      item.appearOn === today
        ? vi.notifications.today
        : item.appearOn === yesterday
          ? vi.notifications.yesterday
          : formatDate(item.appearOn);
    groups.push({ key: item.appearOn, label, items: [item] });
  }
  return groups.map(({ label, items: list }) => ({ label, items: list }));
}
