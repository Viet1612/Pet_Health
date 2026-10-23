/**
 * Chỉ chấp nhận đường dẫn nội bộ cho `?next=`: bắt đầu bằng `/`, không bắt đầu bằng `//` hay `/\`
 * (chống chuyển hướng sang trang ngoài). Sai → `/`.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

/**
 * Đọc `token` từ fragment URL (`#token=...`) rồi xóa fragment khỏi thanh địa chỉ và lịch sử, để
 * token không nằm lại trong lịch sử trình duyệt.
 */
export function takeFragmentToken(): string | null {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    );
  }
  return token;
}

/** Thời điểm hiện tại (ms); gom vào đây để component không gọi hàm impure lúc render. */
export function nowMs(): number {
  return Date.now();
}

/** Số phút còn lại, làm tròn lên (retryAfter tính bằng giây). */
export function minutesFrom(retryAfterSec: number): number {
  return Math.max(1, Math.ceil(retryAfterSec / 60));
}
