import { z } from 'zod';

import type { FieldErrorCode } from '../errors/app-error.js';

/** Thông điệp mặc định theo mã lỗi trường. Schema có thể ghi đè bằng `{ error: '...' }`. */
export const DEFAULT_FIELD_MESSAGES: Record<FieldErrorCode, string> = {
  REQUIRED: 'Trường bắt buộc',
  INVALID_FORMAT: 'Không đúng định dạng',
  OUT_OF_RANGE: 'Giá trị ngoài phạm vi cho phép',
  TOO_LONG: 'Vượt quá độ dài cho phép',
};

/** Thông tin tối thiểu của một issue Zod để phân loại. */
export interface IssueLike {
  code: string;
  input?: unknown;
  origin?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
}

/** Ánh xạ issue Zod v4 → mã lỗi trường ổn định cho client. */
export function fieldErrorCode(issue: IssueLike): FieldErrorCode {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null ? 'REQUIRED' : 'INVALID_FORMAT';
    case 'too_big':
      return issue.origin === 'string' || issue.origin === 'array' ? 'TOO_LONG' : 'OUT_OF_RANGE';
    case 'too_small':
      if (issue.origin === 'string' && Number(issue.minimum) === 1) return 'REQUIRED';
      return issue.origin === 'number' || issue.origin === 'bigint' || issue.origin === 'date'
        ? 'OUT_OF_RANGE'
        : 'INVALID_FORMAT';
    default:
      return 'INVALID_FORMAT';
  }
}

/** Giới hạn của issue cho client ghép câu: `TOO_LONG { max }`, `OUT_OF_RANGE { min | max }`. */
export function fieldErrorParams(issue: IssueLike): Record<string, number> | undefined {
  const code = fieldErrorCode(issue);
  if (code === 'TOO_LONG' && issue.maximum !== undefined) return { max: Number(issue.maximum) };
  if (code === 'OUT_OF_RANGE') {
    if (issue.maximum !== undefined) return { max: Number(issue.maximum) };
    if (issue.minimum !== undefined) return { min: Number(issue.minimum) };
  }
  return undefined;
}

let installed = false;

/**
 * Đặt thông điệp tiếng Việt mặc định cho mọi schema Zod. Thông điệp khai báo riêng trong schema
 * vẫn được ưu tiên (thứ tự ưu tiên của Zod v4).
 */
export function installVietnameseZodMessages(): void {
  if (installed) return;
  installed = true;
  z.config({
    customError: (issue) => DEFAULT_FIELD_MESSAGES[fieldErrorCode(issue)],
  });
}
