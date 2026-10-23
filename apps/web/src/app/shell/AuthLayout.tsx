import { Outlet } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';

import { vi } from '../../i18n/vi';

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={
          inverted
            ? 'bg-on-primary text-primary flex size-12 items-center justify-center rounded-lg'
            : 'bg-primary text-on-primary flex size-12 items-center justify-center rounded-lg'
        }
      >
        <PawPrint size={28} />
      </span>
      <span className="text-h2">{vi.appName}</span>
    </div>
  );
}

/**
 * Khung màn hình khách (UXD-009): phone 1 cột lề 24 px; tablet thẻ form 440 px trên nền
 * primary-soft; desktop (≥ 1280) chia đôi: trái 640 px giới thiệu nền primary, phải form 400 px.
 */
export function AuthLayout() {
  return (
    <div className="md:bg-primary-soft min-h-dvh xl:flex xl:bg-transparent">
      <aside className="bg-primary text-on-primary hidden w-[640px] shrink-0 flex-col justify-center gap-6 px-16 xl:flex">
        <Logo inverted />
        <p className="text-display max-w-md">{vi.auth.tagline}</p>
        <p className="text-body max-w-md opacity-90">{vi.auth.intro}</p>
      </aside>
      <main
        id="main"
        className="flex min-h-dvh flex-1 flex-col justify-center px-6 py-8 md:items-center"
      >
        <div className="bg-surface md:shadow-card w-full md:max-w-[440px] md:rounded-xl md:p-8 xl:max-w-[400px] xl:p-0 xl:shadow-none">
          <div className="mb-6 xl:hidden">
            <Logo />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
