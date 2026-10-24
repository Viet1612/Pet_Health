import { en } from './en';
import { currentLocale } from './locale';
import { vi, type Messages } from './vi';

export type { Locale } from './locale';
export type { Messages } from './vi';

/** Ngôn ngữ đang dùng, chọn một lần lúc tải trang. */
export const locale = currentLocale();

/** Từ điển đang dùng. */
export const m: Messages = locale === 'en' ? en : vi;
