import { parseLocalDate } from '../../../platform/calendar/local-date.js';
import { NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import { formatDelta } from '../domain/weight.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';
import { toWeightEntryView, type WeightEntryView } from './weight-input.js';

export interface WeightsView {
  items: WeightEntryView[];
  target: string | null;
  /** Số đo mới nhất, không phụ thuộc `from/to`. */
  latest: WeightEntryView | null;
  deltaFromPrevious: string | null;
}

function parseRangeDate(field: 'from' | 'to', value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    return parseLocalDate(value);
  } catch {
    throw new ValidationError([{ field, code: 'INVALID_DATE', message: 'Ngày không hợp lệ' }]);
  }
}

/** `GET /pets/{petId}/weights`: một lần gọi đủ cho thẻ tóm tắt, biểu đồ và lịch sử (SCR-10). */
export async function listWeights(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  range: { from?: string | undefined; to?: string | undefined },
): Promise<WeightsView> {
  const from = parseRangeDate('from', range.from);
  const to = parseRangeDate('to', range.to);
  if (from && to && from > to) {
    throw new ValidationError([
      { field: 'from', code: 'INVALID_RANGE', message: 'Ngày bắt đầu phải trước ngày kết thúc' },
    ]);
  }

  const pet = await deps.pets.getOwnedPet(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();

  const [rows, lastTwo] = await Promise.all([
    deps.weights.listByPet(trx, ownerId, petId, { from, to }),
    deps.weights.latestTwo(trx, ownerId, petId),
  ]);
  const [latest, previous] = lastTwo;
  return {
    items: rows.map(toWeightEntryView),
    target: pet.weightTargetKg,
    latest: latest ? toWeightEntryView(latest) : null,
    deltaFromPrevious:
      latest && previous ? formatDelta(latest.weight_kg, previous.weight_kg) : null,
  };
}
