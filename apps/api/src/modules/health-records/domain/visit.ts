// Quy tắc bản ghi khám (S3-03, FR-VIS-001→003). Thuần, không phụ thuộc DB hay HTTP.

export const VISIT_TEXT_MAX = 2000;
export const VISIT_SUMMARY_MAX = 120;
export const VISIT_TEXT_FIELDS = ['symptoms', 'diagnosis', 'prescription'] as const;
export type VisitTextField = (typeof VISIT_TEXT_FIELDS)[number];

export interface VisitFieldError {
  field: VisitTextField;
  code: 'TOO_LONG' | 'SYMPTOMS_OR_DIAGNOSIS_REQUIRED';
  message: string;
}

const codePoints = (s: string): number => Array.from(s).length;

/** NFC + trim; rỗng → `null` (khớp `char_length` của PostgreSQL khi đếm). */
export function normalizeVisitText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.normalize('NFC').trim();
  return normalized === '' ? null : normalized;
}

/**
 * Kiểm 3 trường văn bản đã chuẩn hóa: mỗi trường ≤ 2000 code point; phải có ít nhất triệu chứng
 * hoặc chẩn đoán (lỗi gắn cho cả hai trường).
 */
export function validateVisitText(
  fields: Record<VisitTextField, string | null>,
): VisitFieldError[] {
  const errors: VisitFieldError[] = [];
  for (const field of VISIT_TEXT_FIELDS) {
    const value = fields[field];
    if (value !== null && codePoints(value) > VISIT_TEXT_MAX) {
      errors.push({ field, code: 'TOO_LONG', message: 'Tối đa 2.000 ký tự' });
    }
  }
  if (fields.symptoms === null && fields.diagnosis === null) {
    const message = 'Cần ít nhất triệu chứng hoặc chẩn đoán';
    errors.push(
      { field: 'symptoms', code: 'SYMPTOMS_OR_DIAGNOSIS_REQUIRED', message },
      { field: 'diagnosis', code: 'SYMPTOMS_OR_DIAGNOSIS_REQUIRED', message },
    );
  }
  return errors;
}

/** Rút gọn cho danh sách: xuống dòng → khoảng trắng, 120 code point đầu. */
export function summarizeVisitText(value: string | null): string | null {
  if (value === null) return null;
  return Array.from(value.replace(/\s*[\r\n]+\s*/g, ' '))
    .slice(0, VISIT_SUMMARY_MAX)
    .join('');
}

/** Con trỏ keyset: vị trí của bản ghi cuối trang (`visited_on`, `created_at` dạng text, `id`). */
export interface VisitCursor {
  v: string;
  c: string;
  i: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
// `created_at::text` của PostgreSQL: `2026-09-20 11:40:12.123456+00` (giữ đủ micro giây).
const PG_TIMESTAMPTZ = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeVisitCursor(cursor: VisitCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

/** `null` khi cursor hỏng (route trả `400 INVALID_CURSOR`). */
export function decodeVisitCursor(raw: string): VisitCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { v, c, i } = parsed as Record<string, unknown>;
    if (typeof v !== 'string' || typeof c !== 'string' || typeof i !== 'string') return null;
    if (!DATE.test(v) || !UUID.test(i) || !PG_TIMESTAMPTZ.test(c)) return null;
    return { v, c, i };
  } catch {
    return null;
  }
}
