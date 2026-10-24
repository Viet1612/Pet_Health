/** Ngôn ngữ giao diện (S4-07): mặc định tiếng Việt, không đoán theo trình duyệt. */
export const SUPPORTED = ['vi', 'en'] as const;
export type Locale = (typeof SUPPORTED)[number];

const KEY = 'ph.locale';
/** Đánh dấu vừa đổi ngôn ngữ để trang sau khi tải lại hiện toast. */
const CHANGED_KEY = 'ph.localeChanged';

const isLocale = (v: unknown): v is Locale => SUPPORTED.includes(v as Locale);

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

/** `localStorage['ph.locale']` nếu hợp lệ, ngược lại `vi`. */
export function currentLocale(store: Pick<Storage, 'getItem'> | null = storage('local')): Locale {
  try {
    const v = store?.getItem(KEY);
    return isLocale(v) ? v : 'vi';
  } catch {
    return 'vi';
  }
}

/** Lưu ngôn ngữ rồi tải lại trang: từ điển chỉ được chọn một lần lúc khởi động. */
export function setLocale(l: Locale): void {
  try {
    storage('local')?.setItem(KEY, l);
    storage('session')?.setItem(CHANGED_KEY, '1');
  } catch {
    // Không lưu được (chế độ riêng tư): vẫn tải lại, ngôn ngữ giữ như cũ.
  }
  location.reload();
}

/**
 * Tài khoản thắng thiết bị (S4-09): ngôn ngữ của tài khoản khác ngôn ngữ đang dùng → ghi đè
 * `localStorage` rồi tải lại. Chỉ tải lại khi ghi được, để không lặp vô hạn khi storage bị chặn.
 */
export function adoptAccountLocale(account: Locale, current: Locale): void {
  if (account === current) return;
  const store = storage('local');
  try {
    store?.setItem(KEY, account);
  } catch {
    return;
  }
  if (currentLocale(store) === account) location.reload();
}

/** Trả true một lần sau khi `setLocale` tải lại trang. */
export function consumeLocaleChanged(): boolean {
  try {
    const s = storage('session');
    if (s?.getItem(CHANGED_KEY) !== '1') return false;
    s.removeItem(CHANGED_KEY);
    return true;
  } catch {
    return false;
  }
}
