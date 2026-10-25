// Quy tắc username của hồ sơ công khai (F-02). Thuần, không phụ thuộc DB hay HTTP.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 150;
/** Đổi username tối đa 1 lần mỗi 14 ngày. */
export const USERNAME_CHANGE_DAYS = 14;

/** Tên trùng đường dẫn hoặc dễ gây nhầm là tài khoản chính thức. */
const RESERVED = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'help',
  'pethealth',
  'pet_health',
  'pet.health',
  'api',
  'media',
  'me',
  'settings',
  'feed',
  'login',
  'register',
  'logout',
  'u',
  'p',
  'explore',
  'search',
  'notifications',
  'system',
]);

export type UsernameProblem = 'INVALID' | 'RESERVED';

/** Chuẩn hóa: bỏ khoảng trắng đầu/cuối, chữ thường. */
export const normalizeUsername = (raw: string): string => raw.trim().toLowerCase();

/** `null` nếu hợp lệ. Username đã chuẩn hóa. */
export function usernameProblem(username: string): UsernameProblem | null {
  if (!new RegExp(`^[a-z0-9._]{${String(USERNAME_MIN)},${String(USERNAME_MAX)}}$`).test(username)) {
    return 'INVALID';
  }
  if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
    return 'INVALID';
  }
  if (RESERVED.has(username)) return 'RESERVED';
  return null;
}

/**
 * Còn bao nhiêu ngày mới được đổi username; 0 = đổi được. Chưa đổi lần nào (`changedAt = null`)
 * thì đổi được ngay.
 */
export function daysUntilUsernameChange(changedAt: Date | null, now: Date): number {
  if (!changedAt) return 0;
  const elapsed = now.getTime() - changedAt.getTime();
  const left = USERNAME_CHANGE_DAYS * 86_400_000 - elapsed;
  return left > 0 ? Math.ceil(left / 86_400_000) : 0;
}
