import { parseLocalDate, type LocalDate } from '../../../platform/calendar/local-date.js';
import type { MilestoneStatus } from './display-status.js';

export const MILESTONE_TYPES = ['VACCINE', 'FLEA', 'DEWORM'] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];
export type MilestoneOrigin = 'MANUAL' | 'AUTO';
export type { MilestoneStatus };

const NOTE_MAX = 500;
const CYCLE_MIN = 1;
const CYCLE_MAX = 60;

export interface MilestoneFieldError {
  field: 'type' | 'dueOn' | 'note' | 'cycleMonths';
  code:
    | 'REQUIRED'
    | 'INVALID_ENUM'
    | 'INVALID_DATE'
    | 'TOO_LONG'
    | 'OUT_OF_RANGE'
    | 'NOT_ALLOWED_FOR_VACCINE';
  message: string;
}

const codePoints = (s: string): number => Array.from(s).length;

/** Ghi chú: trim, rỗng → `null`, ≤ 500 ký tự. */
function checkNote(raw: string | null, errors: MilestoneFieldError[]): string | null {
  const trimmed = raw?.normalize('NFC').trim() ?? '';
  if (trimmed === '') return null;
  if (codePoints(trimmed) > NOTE_MAX) {
    errors.push({ field: 'note', code: 'TOO_LONG', message: 'Tối đa 500 ký tự' });
  }
  return trimmed;
}

/** Chu kỳ tự lặp: số nguyên 1–60 tháng; vaccine không có chu kỳ (lặp 12 tháng cố định). */
function checkCycle(
  type: MilestoneType,
  cycle: number | null,
  errors: MilestoneFieldError[],
): number | null {
  if (cycle === null) return null;
  if (type === 'VACCINE') {
    errors.push({
      field: 'cycleMonths',
      code: 'NOT_ALLOWED_FOR_VACCINE',
      message: 'Vaccine tự lặp sau 12 tháng, không đặt chu kỳ',
    });
    return null;
  }
  if (!Number.isInteger(cycle) || cycle < CYCLE_MIN || cycle > CYCLE_MAX) {
    errors.push({
      field: 'cycleMonths',
      code: 'OUT_OF_RANGE',
      message: 'Chu kỳ phải là số tháng nguyên từ 1 đến 60',
    });
    return null;
  }
  return cycle;
}

function checkDate(raw: string, errors: MilestoneFieldError[]): LocalDate | null {
  try {
    return parseLocalDate(raw);
  } catch {
    errors.push({ field: 'dueOn', code: 'INVALID_DATE', message: 'Ngày không hợp lệ' });
    return null;
  }
}

export interface MilestoneInput {
  type: MilestoneType;
  dueOn: LocalDate;
  note: string | null;
  cycleMonths: number | null;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: MilestoneFieldError[] };

/** Tạo mốc: `dueOn` cho phép quá khứ (mốc tạo với hạn đã qua là OVERDUE ngay, không nhắc bù). */
export function validateNewMilestone(raw: {
  type: string;
  dueOn: string;
  note?: string | null | undefined;
  cycleMonths?: number | null | undefined;
}): Validation<MilestoneInput> {
  const errors: MilestoneFieldError[] = [];
  const type = (MILESTONE_TYPES as readonly string[]).includes(raw.type)
    ? (raw.type as MilestoneType)
    : null;
  if (!type) errors.push({ field: 'type', code: 'INVALID_ENUM', message: 'Loại mốc không hợp lệ' });
  const dueOn = checkDate(raw.dueOn, errors);
  const note = checkNote(raw.note ?? null, errors);
  const cycleMonths = type ? checkCycle(type, raw.cycleMonths ?? null, errors) : null;
  if (errors.length || !type || !dueOn) return { ok: false, errors };
  return { ok: true, value: { type, dueOn, note, cycleMonths } };
}

/** Sửa mốc: chỉ kiểm trường có mặt; `cycleMonths: null` bỏ tự lặp. */
export function validateMilestonePatch(
  type: MilestoneType,
  raw: {
    dueOn?: string | undefined;
    note?: string | null | undefined;
    cycleMonths?: number | null | undefined;
  },
): Validation<Partial<Omit<MilestoneInput, 'type'>>> {
  const errors: MilestoneFieldError[] = [];
  const value: Partial<Omit<MilestoneInput, 'type'>> = {};
  if (raw.dueOn !== undefined) {
    const d = checkDate(raw.dueOn, errors);
    if (d) value.dueOn = d;
  }
  if (raw.note !== undefined) value.note = checkNote(raw.note, errors);
  if (raw.cycleMonths !== undefined) value.cycleMonths = checkCycle(type, raw.cycleMonths, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value };
}
