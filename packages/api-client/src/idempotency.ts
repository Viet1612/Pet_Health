/** Khóa cho header `Idempotency-Key` (FR-GEN-005). */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** Header gửi kèm `POST` tạo mới. "Thử lại" phải dùng lại đúng khóa cũ. */
export function idempotencyHeaders(key: string): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': key };
}
