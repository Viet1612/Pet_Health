import { Link, useRouterState } from '@tanstack/react-router';
import { CalendarDays, Heart, House, LogOut, PawPrint, Settings } from 'lucide-react';
import type { ReactNode } from 'react';

import { useLogoutAction } from '../../features/session';
import { vi } from '../../i18n/vi';
import { getSelectedPetId } from '../../lib/selected-pet';
import { cx } from '../../ui/cx';

interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Đường dẫn đích; Sức khỏe và Lịch đi theo thú cưng đang chọn. */
  to: () => string;
  isActive: (path: string) => boolean;
}

const petPath = (suffix: string): string => {
  const petId = getSelectedPetId();
  return petId ? `/pets/${petId}${suffix}` : '/pets';
};

const ITEMS: NavItem[] = [
  {
    key: 'home',
    label: vi.nav.home,
    icon: <House size={24} />,
    to: () => '/',
    isActive: (p) => p === '/',
  },
  {
    key: 'health',
    label: vi.nav.health,
    icon: <Heart size={24} />,
    to: () => petPath('/health/weight'),
    isActive: (p) => /^\/pets\/[^/]+\/health/.test(p),
  },
  {
    key: 'calendar',
    label: vi.nav.calendar,
    icon: <CalendarDays size={24} />,
    to: () => petPath('/milestones'),
    isActive: (p) => /^\/pets\/[^/]+\/milestones/.test(p),
  },
  {
    key: 'pets',
    label: vi.nav.pets,
    icon: <PawPrint size={24} />,
    to: () => '/pets',
    isActive: (p) => p === '/pets' || /^\/pets\/[^/]+$/.test(p),
  },
];

function NavLink({ item, path, rail }: { item: NavItem; path: string; rail: boolean }) {
  const active = item.isActive(path);
  return (
    <Link
      // Đích tính lúc chạy (theo thú cưng đang chọn) nên không kiểm được kiểu tĩnh.
      to={item.to() as never}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'text-caption flex min-h-11 flex-col items-center justify-center gap-1',
        rail ? 'w-full py-2' : 'flex-1 py-1',
        active ? 'text-primary-soft-fg font-bold' : 'text-text-muted',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'inline-flex items-center justify-center rounded-full px-4 py-1',
          active && 'bg-primary-soft',
        )}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function RailLogout() {
  const logout = useLogoutAction();
  return (
    <button
      type="button"
      disabled={logout.isPending}
      onClick={() => void logout.run()}
      className="text-caption text-text-muted flex min-h-11 w-full flex-col items-center justify-center gap-1 py-2"
    >
      <span aria-hidden className="inline-flex items-center justify-center rounded-full px-4 py-1">
        <LogOut size={24} />
      </span>
      {vi.auth.logout}
    </button>
  );
}

/** CMP-08: BottomNav ở < 768 px, SideRail 88 px ở ≥ 768 px (UXD-004). */
export function Navigation() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <nav
        aria-label={vi.nav.label}
        className={cx(
          'border-divider bg-surface fixed inset-x-0 bottom-0 z-40 flex border-t',
          'h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] md:hidden',
        )}
      >
        {ITEMS.map((item) => (
          <NavLink key={item.key} item={item} path={path} rail={false} />
        ))}
      </nav>

      <nav
        aria-label={vi.nav.label}
        className="border-divider bg-surface fixed inset-y-0 left-0 z-40 hidden w-22 flex-col items-center border-r pt-16 pb-4 md:flex"
      >
        <div className="flex w-full flex-1 flex-col items-center gap-2">
          {ITEMS.map((item) => (
            <NavLink key={item.key} item={item} path={path} rail />
          ))}
        </div>
        <NavLink
          item={{
            key: 'settings',
            label: vi.nav.settings,
            icon: <Settings size={24} />,
            to: () => '/settings',
            isActive: (p) => p.startsWith('/settings'),
          }}
          path={path}
          rail
        />
        <RailLogout />
      </nav>
    </>
  );
}
