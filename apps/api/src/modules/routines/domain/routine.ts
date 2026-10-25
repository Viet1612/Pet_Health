import { DateTime } from 'luxon';

// Quy tắc việc hằng ngày (S5-01, FR-RT-001→007). Thuần, không phụ thuộc DB hay HTTP.

export const MAX_ROUTINES_PER_PET = 20;
export const ROUTINE_NAME_MAX = 100;

/** 24 giờ, đủ 2 chữ số: "07:00" hợp lệ; "7:00", "24:00", "07:00:00" bị từ chối. */
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface RoutineFieldError {
  field: 'name' | 'timeOfDay';
  code: 'REQUIRED' | 'TOO_LONG' | 'INVALID_FORMAT';
  message: string;
  params?: { max: number };
}

export type RoutineValidation<T> =
  { ok: true; value: T } | { ok: false; errors: RoutineFieldError[] };

const codePoints = (s: string): number => Array.from(s).length;

function checkName(raw: string, errors: RoutineFieldError[]): string | undefined {
  const name = raw.normalize('NFC').trim();
  if (name === '') {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'Nhập tên việc' });
    return undefined;
  }
  if (codePoints(name) > ROUTINE_NAME_MAX) {
    errors.push({
      field: 'name',
      code: 'TOO_LONG',
      message: 'Tên việc tối đa 100 ký tự',
      params: { max: ROUTINE_NAME_MAX },
    });
    return undefined;
  }
  return name;
}

function checkTime(raw: string, errors: RoutineFieldError[]): string | undefined {
  if (TIME_OF_DAY.test(raw)) return raw;
  errors.push({
    field: 'timeOfDay',
    code: 'INVALID_FORMAT',
    message: 'Giờ theo định dạng HH:MM, 24 giờ',
  });
  return undefined;
}

/** Kiểm việc mới: tên 1–100 ký tự sau trim, giờ `HH:MM`. */
export function validateNewRoutine(raw: {
  name: string;
  timeOfDay: string;
}): RoutineValidation<{ name: string; timeOfDay: string }> {
  const errors: RoutineFieldError[] = [];
  const name = checkName(raw.name, errors);
  const timeOfDay = checkTime(raw.timeOfDay, errors);
  if (name === undefined || timeOfDay === undefined) return { ok: false, errors };
  return { ok: true, value: { name, timeOfDay } };
}

/** Kiểm bản sửa: chỉ kiểm trường có mặt. */
export function validateRoutinePatch(raw: {
  name?: string | undefined;
  timeOfDay?: string | undefined;
}): RoutineValidation<{ name?: string; timeOfDay?: string }> {
  const errors: RoutineFieldError[] = [];
  const value: { name?: string; timeOfDay?: string } = {};
  if (raw.name !== undefined) {
    const name = checkName(raw.name, errors);
    if (name !== undefined) value.name = name;
  }
  if (raw.timeOfDay !== undefined) {
    const timeOfDay = checkTime(raw.timeOfDay, errors);
    if (timeOfDay !== undefined) value.timeOfDay = timeOfDay;
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

/**
 * Quy đổi giờ trong ngày khi tài khoản đổi múi giờ: cùng một thời điểm thật, đọc theo múi mới.
 * Lấy độ lệch tại ngày `onDate` (theo múi cũ): "07:00" ở Asia/Ho_Chi_Minh → "00:00" ở UTC.
 */
export function convertTimeOfDay(
  time: string,
  fromTz: string,
  toTz: string,
  onDate: string,
): string {
  const at = DateTime.fromISO(`${onDate}T${toHHMM(time)}`, { zone: fromTz });
  return at.isValid ? at.setZone(toTz).toFormat('HH:mm') : toHHMM(time);
}

/** Kiểu `time` của PostgreSQL trả "07:00:00" → "07:00". */
export const toHHMM = (time: string): string => time.slice(0, 5);
