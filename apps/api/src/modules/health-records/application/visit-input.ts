import { parseLocalDate, type LocalDate } from '../../../platform/calendar/local-date.js';
import { ValidationError, type FieldError } from '../../../platform/errors/app-error.js';
import { normalizeVisitText, validateVisitText } from '../domain/visit.js';
import type { VisitFields, VisitRow } from './ports.js';

/** Dữ liệu thô của POST/PATCH; `null` hoặc `""` xóa một trường văn bản. */
export interface RawVisitInput {
  visitedOn?: string | undefined;
  symptoms?: string | null | undefined;
  diagnosis?: string | null | undefined;
  prescription?: string | null | undefined;
}

export interface VisitPhotoView {
  id: string;
  status: 'PROCESSING' | 'READY';
  thumbUrl: string | null;
  url: string | null;
  createdAt: string;
}

export interface VisitView {
  id: string;
  petId: string;
  visitedOn: string;
  symptoms: string | null;
  diagnosis: string | null;
  prescription: string | null;
  createdAt: string;
  updatedAt: string;
  photos: VisitPhotoView[];
}

export const toVisitView = (row: VisitRow, photos: VisitPhotoView[] = []): VisitView => ({
  id: row.id,
  petId: row.pet_id,
  visitedOn: row.visited_on,
  symptoms: row.symptoms,
  diagnosis: row.diagnosis,
  prescription: row.prescription,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  photos,
});

/**
 * Gộp dữ liệu gửi lên với bản ghi hiện có (PATCH) hoặc rỗng (POST), chuẩn hóa và kiểm lại toàn
 * bộ. `visitedOn` thiếu → giữ cũ, hoặc hôm nay khi tạo mới.
 */
export function buildVisitFields(
  input: RawVisitInput,
  current: VisitFields | null,
  today: LocalDate,
): VisitFields {
  const errors: FieldError[] = [];
  const pick = (field: 'symptoms' | 'diagnosis' | 'prescription') =>
    input[field] === undefined ? (current?.[field] ?? null) : normalizeVisitText(input[field]);
  const text = {
    symptoms: pick('symptoms'),
    diagnosis: pick('diagnosis'),
    prescription: pick('prescription'),
  };
  errors.push(...validateVisitText(text));

  let visitedOn: string = current?.visitedOn ?? today;
  if (input.visitedOn !== undefined) {
    try {
      const date = parseLocalDate(input.visitedOn);
      if (date > today) {
        errors.push({
          field: 'visitedOn',
          code: 'DATE_IN_FUTURE',
          message: 'Ngày không được ở tương lai',
        });
      } else {
        visitedOn = date;
      }
    } catch {
      errors.push({ field: 'visitedOn', code: 'REQUIRED', message: 'Trường bắt buộc' });
    }
  }

  if (errors.length) throw new ValidationError(errors);
  return { visitedOn, ...text };
}
