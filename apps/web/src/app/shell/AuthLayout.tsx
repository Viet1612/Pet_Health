import { Outlet } from '@tanstack/react-router';
import { CalendarCheck, NotebookPen, PawPrint, TrendingUp } from 'lucide-react';

import { vi } from '../../i18n/vi';
import { cx } from '../../ui/cx';

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cx(
          'flex size-12 items-center justify-center rounded-lg',
          inverted ? 'bg-on-primary text-primary' : 'bg-primary text-on-primary',
        )}
      >
        <PawPrint size={28} />
      </span>
      <span className="text-h2">{vi.appName}</span>
    </div>
  );
}

const FEATURE_ICONS = [TrendingUp, CalendarCheck, NotebookPen];

/** Cột giới thiệu (desktop): nền primary, logo, khẩu hiệu, 3 tính năng chính. */
function IntroPanel() {
  return (
    <aside className="bg-primary text-on-primary relative hidden w-[45%] max-w-[720px] shrink-0 overflow-hidden lg:flex">
      {/* Họa tiết chân thú mờ phía sau, chỉ để trang trí. */}
      <PawPrint
        aria-hidden
        size={360}
        className="pointer-events-none absolute -right-24 -bottom-20 rotate-[-20deg] opacity-10"
      />
      <PawPrint
        aria-hidden
        size={140}
        className="pointer-events-none absolute top-16 right-20 rotate-[15deg] opacity-10"
      />
      <div className="relative flex w-full flex-col justify-between px-12 py-12 xl:px-16">
        <Logo inverted />
        <div className="flex max-w-lg flex-col gap-6">
          <p className="text-[40px] leading-[48px] font-bold">{vi.auth.tagline}</p>
          <p className="text-body opacity-90">{vi.auth.intro}</p>
          <ul className="mt-4 flex flex-col gap-5">
            {vi.auth.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? PawPrint;
              return (
                <li key={f.title} className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15"
                  >
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className="text-body block font-semibold">{f.title}</span>
                    <span className="text-small block opacity-85">{f.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-small opacity-75">© {vi.appName}</p>
      </div>
    </aside>
  );
}

/**
 * Khung màn hình khách (UXD-009): phone 1 cột lề 24 px; tablet thẻ form 440 px trên nền
 * primary-soft; desktop (≥ 1024) chia đôi: trái cột giới thiệu nền primary, phải thẻ form 440 px.
 */
export function AuthLayout() {
  return (
    <div className="md:bg-primary-soft min-h-dvh lg:flex">
      <IntroPanel />
      <main
        id="main"
        className="flex min-h-dvh flex-1 flex-col justify-center px-6 py-8 md:items-center md:px-8 lg:py-12"
      >
        <div className="bg-surface w-full md:max-w-[440px] md:rounded-xl md:p-10 md:shadow-[0_8px_32px_rgb(194_24_91/0.10)]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
