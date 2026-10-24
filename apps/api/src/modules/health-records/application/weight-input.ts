import { parseLocalDate, type LocalDate } from '../../../platform/calendar/local-date.js';
import { todayIn } from '../../../platform/calendar/today.js';
import {
  UnauthenticatedError,
  ValidationError,
  type FieldError,
} from '../../../platform/errors/app-error.js';
import {
  formatTenths,
  parseWeightKg,
  WEIGHT_RANGE_MESSAGE,
  WEIGHT_RANGE_PARAMS,
} from '../domain/weight.js';
import type { HealthRecordsAppDeps, Trx, WeightEntryRow } from './ports.js';

export interface WeightEntryView {
  id: string;
  measuredOn: string;
  weightKg: string;
  createdAt: string;
}

export const toWeightEntryView = (row: WeightEntryRow): WeightEntryView => ({
  id: row.id,
  measuredOn: row.measured_on,
  weightKg: row.weight_kg,
  createdAt: row.created_at.toISOString(),
});

/** Hôm nay theo múi giờ tài khoản. */
export async function todayForOwner(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
): Promise<LocalDate> {
  const tz = await deps.pets.ownerTimezone(trx, ownerId);
  if (tz === undefined) throw new UnauthenticatedError();
  return todayIn(tz, deps.clock.now());
}

/**
 * Kiểm `weightKg` và `measuredOn` (dùng chung POST/PATCH). Trường không có thì bỏ qua; lỗi → 422
 * với thông điệp theo spec.
 */
export function validateWeightInput(
  input: { weightKg?: string | undefined; measuredOn?: string | undefined },
  today: LocalDate,
): { weightKg?: string; measuredOn?: string } {
  const errors: FieldError[] = [];
  const out: { weightKg?: string; measuredOn?: string } = {};

  if (input.weightKg !== undefined) {
    const tenths = parseWeightKg(input.weightKg);
    if (tenths === null) {
      errors.push({
        field: 'weightKg',
        code: 'OUT_OF_RANGE',
        message: WEIGHT_RANGE_MESSAGE,
        params: WEIGHT_RANGE_PARAMS,
      });
    } else {
      out.weightKg = formatTenths(tenths);
    }
  }

  if (input.measuredOn !== undefined) {
    try {
      const date = parseLocalDate(input.measuredOn);
      if (date > today) {
        errors.push({
          field: 'measuredOn',
          code: 'DATE_IN_FUTURE',
          message: 'Ngày không được ở tương lai',
        });
      } else {
        out.measuredOn = date;
      }
    } catch {
      errors.push({ field: 'measuredOn', code: 'INVALID_DATE', message: 'Ngày không hợp lệ' });
    }
  }

  if (errors.length) throw new ValidationError(errors);
  return out;
}
