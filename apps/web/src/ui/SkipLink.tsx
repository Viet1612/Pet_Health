import { m } from '../i18n';

/** Phần tử focus đầu tiên: nhảy qua TopBar/điều hướng tới `<main id="main">` (WCAG 2.4.1). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="bg-surface text-primary sr-only z-50 rounded-md px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {m.a11y.skipToMain}
    </a>
  );
}
