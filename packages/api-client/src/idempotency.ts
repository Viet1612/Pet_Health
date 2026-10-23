/**
 * Khóa cho header `Idempotency-Key` (FR-GEN-005): UUID v4. `crypto.randomUUID` chỉ có ở secure
 * context (HTTPS, localhost); mở dev bằng `http://IP-LAN` thì dựng UUID từ `getRandomValues`.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40; // phiên bản 4
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // biến thể RFC 4122
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Header gửi kèm `POST` tạo mới. "Thử lại" phải dùng lại đúng khóa cũ. */
export function idempotencyHeaders(key: string): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': key };
}
