import { m } from '../../i18n';
import { formatDate } from '../../lib/format';

/** `YYYY-MM-DD` − 1 ngày (lịch, UTC). */
function previousDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export { formatDate } from '../../lib/format';

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
        ? m.notifications.today
        : item.appearOn === yesterday
          ? m.notifications.yesterday
          : formatDate(item.appearOn);
    groups.push({ key: item.appearOn, label, items: [item] });
  }
  return groups.map(({ label, items: list }) => ({ label, items: list }));
}
