/** Mã lỗi PostgreSQL được thử lại: serialization_failure, deadlock_detected (SAD §4.2.3). */
const RETRYABLE_CODES = new Set(['40001', '40P01']);

export function isRetryableDbError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    RETRYABLE_CODES.has(error.code)
  );
}

/** Chạy `fn`; nếu lỗi serialization/deadlock thì thử lại đúng 1 lần. Lỗi khác ném ngay. */
export async function withRetryOnConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isRetryableDbError(error)) throw error;
    return fn();
  }
}
