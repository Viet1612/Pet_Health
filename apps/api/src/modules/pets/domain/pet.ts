import { parseLocalDate, type LocalDate } from '../../../platform/calendar/local-date.js';

/** Tối đa 10 thú cưng mỗi tài khoản (BRU-009). */
export const PET_LIMIT = 10;

export const PET_SEXES = ['MALE', 'FEMALE'] as const;
export type PetSex = (typeof PET_SEXES)[number];

const NAME_MAX = 50;
const DESCRIPTION_MAX = 2000;

/** Dữ liệu thú cưng đã kiểm tra, sẵn sàng ghi. */
export interface PetInput {
  name: string;
  breed: string;
  sex: PetSex;
  birthDate: LocalDate;
  description: string | null;
}

/** Dữ liệu thô từ client (POST/PATCH); mọi trường đều có thể thiếu. */
export interface RawPetInput {
  name?: string | undefined;
  breed?: string | undefined;
  sex?: string | undefined;
  birthDate?: string | undefined;
  description?: string | null | undefined;
}

export interface PetFieldError {
  field: keyof PetInput;
  code: 'REQUIRED' | 'TOO_LONG' | 'INVALID_ENUM' | 'INVALID_DATE' | 'FUTURE_DATE';
  message: string;
  params?: { max: number };
}

export type PetValidation<T> = { ok: true; value: T } | { ok: false; errors: PetFieldError[] };

const MESSAGES: Record<PetFieldError['code'], string> = {
  REQUIRED: 'Trường bắt buộc',
  TOO_LONG: 'Tối đa 50 ký tự',
  INVALID_ENUM: 'Giá trị không hợp lệ',
  INVALID_DATE: 'Ngày không hợp lệ',
  FUTURE_DATE: 'Ngày sinh không được ở tương lai',
};

/** Độ dài theo code point, khớp `varchar(n)` của PostgreSQL. */
const codePoints = (s: string): number => Array.from(s).length;

/**
 * Kiểm dữ liệu thú cưng (FR-PET-001/004). `create`: 4 trường bắt buộc. `patch`: chỉ kiểm trường có
 * mặt. `today` là ngày hiện tại theo múi giờ tài khoản.
 */
export function validatePetInput(
  raw: RawPetInput,
  today: LocalDate,
  mode: 'create',
): PetValidation<PetInput>;
export function validatePetInput(
  raw: RawPetInput,
  today: LocalDate,
  mode: 'patch',
): PetValidation<Partial<PetInput>>;
export function validatePetInput(
  raw: RawPetInput,
  today: LocalDate,
  mode: 'create' | 'patch',
): PetValidation<Partial<PetInput>> {
  const errors: PetFieldError[] = [];
  const value: Partial<PetInput> = {};
  const fail = (
    field: PetFieldError['field'],
    code: PetFieldError['code'],
    message?: string,
    max?: number,
  ) => {
    errors.push({
      field,
      code,
      message: message ?? MESSAGES[code],
      ...(max === undefined ? {} : { params: { max } }),
    });
  };
  const required = mode === 'create';

  for (const field of ['name', 'breed'] as const) {
    const v = raw[field];
    if (v === undefined) {
      if (required) fail(field, 'REQUIRED');
      continue;
    }
    const trimmed = v.trim();
    if (trimmed === '') fail(field, 'REQUIRED');
    else if (codePoints(trimmed) > NAME_MAX) fail(field, 'TOO_LONG', undefined, NAME_MAX);
    else value[field] = trimmed;
  }

  if (raw.sex === undefined || raw.sex === '') {
    if (required || raw.sex === '') fail('sex', 'REQUIRED');
  } else if ((PET_SEXES as readonly string[]).includes(raw.sex)) {
    value.sex = raw.sex as PetSex;
  } else {
    fail('sex', 'INVALID_ENUM');
  }

  if (raw.birthDate === undefined || raw.birthDate === '') {
    if (required || raw.birthDate === '') fail('birthDate', 'REQUIRED');
  } else {
    try {
      const date = parseLocalDate(raw.birthDate);
      if (date > today) fail('birthDate', 'FUTURE_DATE');
      else value.birthDate = date;
    } catch {
      fail('birthDate', 'INVALID_DATE');
    }
  }

  if (raw.description !== undefined) {
    const trimmed = raw.description?.trim() ?? '';
    if (codePoints(trimmed) > DESCRIPTION_MAX)
      fail('description', 'TOO_LONG', 'Tối đa 2.000 ký tự', DESCRIPTION_MAX);
    else value.description = trimmed === '' ? null : trimmed;
  } else if (required) {
    value.description = null;
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}
