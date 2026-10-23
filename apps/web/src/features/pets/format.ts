import { vi } from '../../i18n/vi';
import type { Pet } from './queries';

/** Ký tự đầu (grapheme, giữ dấu tiếng Việt và emoji) viết hoa: "mochi" → "M", "ếch" → "Ế". */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  const first =
    typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('vi', { granularity: 'grapheme' })
          .segment(trimmed)
          [Symbol.iterator]()
          .next().value?.segment
      : Array.from(trimmed)[0];
  return (first ?? '?').toLocaleUpperCase('vi');
}

export const sexLabel = (sex: Pet['sex']): string =>
  sex === 'MALE' ? vi.pets.male : vi.pets.female;

/** "7 năm 7 tháng · Poodle · Cái" */
export const petSubline = (pet: Pet): string =>
  `${pet.ageText} · ${pet.breed} · ${sexLabel(pet.sex)}`;

/** `2019-03-15` → `15/03/2019` */
export function formatLocalDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d ?? ''}/${m ?? ''}/${y ?? ''}`;
}

/** Ngày hôm nay theo đồng hồ thiết bị, dạng `YYYY-MM-DD`. */
export function deviceToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
