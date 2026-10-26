import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  CalendarDays,
  Heart,
  House,
  LogOut,
  Newspaper,
  PawPrint,
  Settings,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useLogoutAction } from '../../features/session';
import { myProfileQuery } from '../../features/social';
import { m } from '../../i18n';
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
    label: m.nav.home,
    icon: <House size={24} />,
    to: () => '/',
    isActive: (p) => p === '/',
  },
  {
    key: 'health',
    label: m.nav.health,
    icon: <Heart size={24} />,
    to: () => petPath('/health/weight'),
    isActive: (p) => /^\/pets\/[^/]+\/health/.test(p),
  },
  {
    key: 'feed',
    label: m.nav.feed,
    icon: <Newspaper size={24} />,
    to: () => '/feed',
    isActive: (p) => ['/feed', '/u/', '/p/', '/search'].some((prefix) => p.startsWith(prefix)),
  },
  {
    key: 'calendar',
    label: m.nav.calendar,
    icon: <CalendarDays size={24} />,
    to: () => petPath('/milestones'),
    isActive: (p) => /^\/pets\/[^/]+\/milestones/.test(p) || p.startsWith('/milestones/'),
  },
  {
    key: 'pets',
    label: m.nav.pets,
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
        'text-caption flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap',
        rail ? 'w-full py-2' : 'flex-1 py-1',
        active ? 'text-primary-soft-fg font-bold' : 'text-text-muted',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'inline-flex items-center justify-center rounded-full px-3 py-1 min-[400px]:px-4',
          active && 'bg-primary-soft',
        )}
      >
        {item.icon}
      </span>
      {/* 6 mục trên phone hẹp: chữ nhỏ hơn dưới 400 px, cắt "…" nếu vẫn không vừa. */}
      <span
        className={cx(
          'max-w-full truncate px-0.5',
          !rail && 'min-[400px]:text-caption text-[11px]',
        )}
      >
        {item.label}
      </span>
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
      {m.auth.logout}
    </button>
  );
}

/**
 * Mục "Hồ sơ" (Phase 2): tới hồ sơ công khai của mình; chưa tải xong hồ sơ thì qua `/u/me` (tự
 * chuyển tiếp, chưa có hồ sơ → Bản tin để tạo).
 * Đang ở hồ sơ của mình thì "Hồ sơ" sáng, không phải "Bản tin".
 */
function profileItem(username: string | undefined): NavItem {
  const mine = username ? `/u/${username}` : null;
  return {
    key: 'profile',
    label: m.nav.profile,
    icon: <UserRound size={24} />,
    to: () => mine ?? '/u/me',
    isActive: (p) => mine !== null && p.toLowerCase() === mine,
  };
}

/** CMP-08: BottomNav ở < 768 px, SideRail 88 px ở ≥ 768 px (UXD-004). */
export function Navigation() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useQuery(myProfileQuery);
  const profileNav = profileItem(profile?.username);
  const items = ITEMS.map((item) =>
    item.key === 'feed'
      ? { ...item, isActive: (p: string) => item.isActive(p) && !profileNav.isActive(p) }
      : item,
  );
  items.push(profileNav);

  return (
    <>
      <nav
        aria-label={m.nav.label}
        className={cx(
          'border-divider bg-surface fixed inset-x-0 bottom-0 z-40 flex border-t',
          'h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] md:hidden',
        )}
      >
        {items.map((item) => (
          <NavLink key={item.key} item={item} path={path} rail={false} />
        ))}
      </nav>

      <nav
        aria-label={m.nav.label}
        className="border-divider bg-surface fixed inset-y-0 left-0 z-40 hidden w-22 flex-col items-center border-r pt-16 pb-4 md:flex"
      >
        <div className="flex w-full flex-1 flex-col items-center gap-2">
          {items.map((item) => (
            <NavLink key={item.key} item={item} path={path} rail />
          ))}
        </div>
        <NavLink
          item={{
            key: 'settings',
            label: m.nav.settings,
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
