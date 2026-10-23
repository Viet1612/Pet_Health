import { uuidv7 } from 'uuidv7';

/** Khóa chính UUIDv7: không đoán được, sắp theo thời gian (AD-012). */
export function newId(): string {
  return uuidv7();
}
