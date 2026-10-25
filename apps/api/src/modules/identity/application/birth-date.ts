import { parseLocalDate, type LocalDate } from '../../../platform/calendar/local-date.js';
import { todayIn } from '../../../platform/calendar/today.js';
import { ValidationError } from '../../../platform/errors/app-error.js';

const MIN_BIRTH_DATE = '1900-01-01';

/** Ngày sinh người dùng (F-02): ngày có thật, từ 1900-01-01 tới hôm nay theo múi giờ tài khoản. */
export function checkBirthDate(raw: string, timezone: string, now: Date): LocalDate {
  let date: LocalDate;
  try {
    date = parseLocalDate(raw);
  } catch {
    throw new ValidationError([
      { field: 'birthDate', code: 'INVALID_DATE', message: 'Ngày sinh không hợp lệ' },
    ]);
  }
  if (date > todayIn(timezone, now)) {
    throw new ValidationError([
      { field: 'birthDate', code: 'FUTURE_DATE', message: 'Ngày sinh không được ở tương lai' },
    ]);
  }
  if (date < MIN_BIRTH_DATE) {
    throw new ValidationError([
      { field: 'birthDate', code: 'INVALID_DATE', message: 'Ngày sinh không hợp lệ' },
    ]);
  }
  return date;
}
