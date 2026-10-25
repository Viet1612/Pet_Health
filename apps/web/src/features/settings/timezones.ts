/** Múi giờ ghim đầu danh sách. */
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** "GMT+7" của một múi giờ tại thời điểm hiện tại. */
export function offsetOf(tz: string): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}

/** "Asia/Ho_Chi_Minh (GMT+7)" */
export const timezoneLabel = (tz: string): string => {
  const offset = offsetOf(tz);
  return offset ? `${tz} (${offset})` : tz;
};

/** Giờ hiện tại ở múi giờ đó, "10:24" (chỉ để hiển thị). */
export function nowIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return '';
  }
}

/** Bỏ dấu, chữ thường, `_`/`/` thành khoảng trắng: "Hồ Chí" ↔ "Asia/Ho_Chi_Minh". */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .replace(/[_/]/g, ' ')
    .toLowerCase();

/**
 * Danh sách cho bộ chọn: ICU có thể dùng tên cũ (`Asia/Saigon`) nên thêm tên chuẩn của Việt Nam,
 * ghim đầu; lọc theo chuỗi con không dấu.
 */
export function timezoneOptions(query: string): string[] {
  const all = Intl.supportedValuesOf('timeZone').filter((tz) => tz !== 'Asia/Saigon');
  const list = [DEFAULT_TIMEZONE, ...all.filter((tz) => tz !== DEFAULT_TIMEZONE), 'UTC'];
  const q = normalize(query.trim());
  return q ? list.filter((tz) => normalize(tz).includes(q)) : list;
}
