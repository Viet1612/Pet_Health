// Bản nháp khi hết phiên lúc đang lưu form (FLW-06, S6-03). Chỉ `sessionStorage` của tab (DC-002),
// không bao giờ chứa mật khẩu hay tệp; xóa ngay khi khôi phục.

const PREFIX = 'ph.draft.';
const VERSION = 1;

type DraftValue = string | number | boolean | null;

interface Draft {
  v: number;
  formId: string;
  savedAt: string;
  values: Record<string, DraftValue>;
}

/** Khóa theo màn hình đang mở (đường dẫn + query, để mở lại đúng dialog). */
const keyOf = (location: { pathname: string; search: string }) =>
  `${PREFIX}${location.pathname}${location.search}`;

const currentLocation = () => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

/**
 * Lưu bản nháp. Bỏ trường có tên chứa "password" và mọi giá trị không phải chuỗi/số/boolean/null
 * (ví dụ `File`).
 */
export function saveDraft(
  formId: string,
  values: Record<string, unknown>,
  location = currentLocation(),
): void {
  const safe: Record<string, DraftValue> = {};
  for (const [k, v] of Object.entries(values)) {
    if (/password/i.test(k)) continue;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) safe[k] = v as DraftValue;
  }
  const draft: Draft = { v: VERSION, formId, savedAt: new Date().toISOString(), values: safe };
  try {
    sessionStorage.setItem(keyOf(location), JSON.stringify(draft));
  } catch {
    // Storage bị chặn: mất tính năng giữ bản nháp.
  }
}

/** Đọc bản nháp của màn hình hiện tại nếu đúng `formId` (không xóa); hỏng hay sai form → `null`. */
export function readDraft(
  formId: string,
  location = currentLocation(),
): Record<string, DraftValue> | null {
  try {
    const raw = sessionStorage.getItem(keyOf(location));
    if (raw === null) return null;
    const draft = JSON.parse(raw) as Partial<Draft>;
    if (draft.v !== VERSION || draft.formId !== formId || typeof draft.values !== 'object') {
      clearDraft(location);
      return null;
    }
    return draft.values;
  } catch {
    clearDraft(location);
    return null;
  }
}

/** Xóa bản nháp của màn hình (sau khi khôi phục xong). */
export function clearDraft(location = currentLocation()): void {
  try {
    sessionStorage.removeItem(keyOf(location));
  } catch {
    // bỏ qua
  }
}
