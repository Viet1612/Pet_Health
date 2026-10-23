import { addMonths, dateToSeconds, tenthsOf } from './format';
import type { WeightEntry } from './queries';

export interface ChartPoint {
  /** Giây Unix; số đo cùng ngày lệch thêm i × 60 s để trục X vẫn tăng dần. */
  x: number;
  y: number;
  measuredOn: string;
  weightKg: string;
}

export interface ChartData {
  points: ChartPoint[];
  /** Đầu và cuối cửa sổ 6 tháng (giây Unix). */
  start: number;
  end: number;
}

const SAME_DAY_STEP_SEC = 60;

/**
 * Cửa sổ 6 tháng tính lùi từ số đo mới nhất (FR-WGT-004), trục X tăng dần; cùng ngày sắp theo
 * `createdAt` tăng dần.
 */
export function buildChartData(items: WeightEntry[]): ChartData | null {
  if (items.length === 0) return null;
  const latest = items.reduce((max, e) => (e.measuredOn > max ? e.measuredOn : max), '');
  const windowStart = addMonths(latest, -6);
  const sorted = items
    .filter((e) => e.measuredOn >= windowStart)
    .sort((a, b) =>
      a.measuredOn === b.measuredOn
        ? a.createdAt.localeCompare(b.createdAt)
        : a.measuredOn.localeCompare(b.measuredOn),
    );

  let sameDay = 0;
  const points = sorted.map((e, i) => {
    sameDay = i > 0 && sorted[i - 1]?.measuredOn === e.measuredOn ? sameDay + 1 : 0;
    return {
      x: dateToSeconds(e.measuredOn) + sameDay * SAME_DAY_STEP_SEC,
      y: tenthsOf(e.weightKg) / 10,
      measuredOn: e.measuredOn,
      weightKg: e.weightKg,
    };
  });
  return { points, start: dateToSeconds(windowStart), end: dateToSeconds(latest) };
}

/** Trục Y luôn bao trùm mục tiêu: [min − 0,5; max + 0,5]. */
export function yRange(values: number[], target: number | null): [number, number] {
  const all = target === null ? values : [...values, target];
  return [Math.min(...all) - 0.5, Math.max(...all) + 0.5];
}

/** Mốc ngày 1 của từng tháng trong [start, end] (giây Unix, UTC): nhãn T6…T11. */
export function monthSplits(start: number, end: number): number[] {
  const d = new Date(start * 1000);
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth();
  if (d.getUTCDate() !== 1) month += 1;
  const splits: number[] = [];
  for (;;) {
    const t = Date.UTC(year + Math.floor(month / 12), month % 12, 1) / 1000;
    if (t > end) break;
    splits.push(t);
    month += 1;
    if (month >= 12) {
      month -= 12;
      year += 1;
    }
  }
  return splits;
}
