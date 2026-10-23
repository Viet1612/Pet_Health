import { newIdempotencyKey } from '@ph/api-client';
import { useCallback, useState } from 'react';

/**
 * Khóa `Idempotency-Key` cho một form tạo mới (FR-GEN-005, UI Blueprint §3.4.1): tạo khi form mở,
 * giữ nguyên qua các lần "Thử lại", gọi `reset()` sau khi lưu thành công hoặc khi đóng form.
 */
export function useIdempotencyKey(): { key: string; reset: () => void } {
  const [key, setKey] = useState(newIdempotencyKey);
  const reset = useCallback(() => {
    setKey(newIdempotencyKey());
  }, []);
  return { key, reset };
}
