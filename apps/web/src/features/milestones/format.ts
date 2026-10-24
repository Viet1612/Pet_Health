import { vi } from '../../i18n/vi';
import type { Milestone, MilestoneType } from './queries';

const t = vi.milestones;

export const typeLabel = (type: MilestoneType): string => t.types[type];

/** "Tiêm vaccine · Dại" (không ghi chú thì chỉ tên loại). */
export const milestoneTitle = (m: { type: MilestoneType; note: string | null }): string =>
  m.note ? `${typeLabel(m.type)} · ${m.note}` : typeLabel(m.type);

/** `2026-11-17` → `17/11/2026` */
export function formatDate(isoDate: string): string {
  const [y = '', m = '', d = ''] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** `2026-11-17` → `17/11` */
export function formatDayMonth(isoDate: string): string {
  const [, m = '', d = ''] = isoDate.split('-');
  return `${d}/${m}`;
}

/** Dòng phụ: "Hạn 17/11/2026 · tự lặp 12 tháng" / "· chu kỳ 3 tháng" / không gì. */
export function dueLine(m: Milestone): string {
  const repeat =
    m.type === 'VACCINE' ? t.vaccineCycle : m.cycleMonths ? t.cycle(m.cycleMonths) : null;
  return repeat ? `${t.due(formatDate(m.dueOn))} · ${repeat}` : t.due(formatDate(m.dueOn));
}

export type ChipTone = 'danger' | 'warning' | 'neutral' | 'success' | 'cancelled';

/** StatusChip: luôn có chữ đi kèm màu (quá hạn đỏ, ≤ 7 ngày cam, đã thực hiện xanh). */
export function statusChip(m: Milestone): { tone: ChipTone; label: string } {
  if (m.status === 'DONE')
    return { tone: 'success', label: t.chip.done(formatDate(m.doneOn ?? '')) };
  if (m.status === 'CANCELLED') return { tone: 'cancelled', label: t.chip.cancelled };
  const n = m.daysUntilDue ?? 0;
  if (n < 0) return { tone: 'danger', label: t.chip.overdue(-n) };
  if (n === 0) return { tone: 'warning', label: t.chip.today };
  if (n === 1) return { tone: 'warning', label: t.chip.tomorrow };
  if (n <= 7) return { tone: 'warning', label: t.chip.soon(n) };
  return { tone: 'neutral', label: t.chip.later(n, formatDayMonth(m.dueOn)) };
}

/** Cộng tháng lịch, kẹp ngày cuối tháng (chỉ để xem trước; ngày thật do server trả). */
export function addCalendarMonths(isoDate: string, months: number): string {
  const [y = 0, mo = 1, d = 1] = isoDate.split('-').map(Number);
  const total = y * 12 + (mo - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(year)}-${pad(month)}-${pad(Math.min(d, last))}`;
}

/** Hạn dự kiến của mốc kế tiếp (FLW-04): vaccine + 12 tháng, ve/giun + chu kỳ, không chu kỳ → null. */
export function nextDuePreview(
  type: MilestoneType,
  cycleMonths: number | null,
  doneOn: string,
): string | null {
  if (type === 'VACCINE') return addCalendarMonths(doneOn, 12);
  return cycleMonths ? addCalendarMonths(doneOn, cycleMonths) : null;
}
