import { useRouterState } from '@tanstack/react-router';
import { Bell, LogOut, Menu, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PetSwitcher } from '../../features/pets';
import { useLogoutAction } from '../../features/session';
import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';

/** CMP-07: chuông (S0 chỉ hiển thị; số chưa xem ở S4-05). */
function BellButton() {
  return <IconButton aria-label={vi.topBar.notifications} icon={<Bell size={24} />} />;
}

/** Menu phone: hiện mục Đăng xuất (các mục khác thêm ở task sau). */
function PhoneMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogoutAction();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative md:hidden">
      <IconButton
        aria-label={vi.topBar.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<Menu size={24} />}
        onClick={() => {
          setOpen((v) => !v);
        }}
      />
      {open && (
        <div
          role="menu"
          className="border-divider bg-surface absolute top-12 right-0 z-50 min-w-48 rounded-md border py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={logout.isPending}
            className="text-body hover:bg-surface-2 flex min-h-11 w-full items-center gap-3 px-4"
            onClick={() => void logout.run()}
          >
            <LogOut size={20} aria-hidden />
            {vi.auth.logout}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * CMP-03 (khung): phone = khe PetSwitcher · Chuông · "+" · Menu;
 * ≥ 768 px = tiêu đề màn hình · khe PetSwitcher · Chuông · "+ Thêm".
 */
export function TopBar() {
  const title = useRouterState({
    select: (s) => [...s.matches].reverse().find((m) => m.staticData.title)?.staticData.title,
  });

  return (
    <header className="border-divider bg-surface sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-2 md:pr-6 md:pl-26">
      <span className="text-h2 hidden md:inline">{title}</span>
      <div className="min-w-0 flex-1">
        <PetSwitcher />
      </div>
      <BellButton />
      <IconButton aria-label={vi.topBar.quickAdd} icon={<Plus size={24} />} className="md:hidden" />
      <Button variant="primary" icon={<Plus size={20} />} className="hidden md:inline-flex">
        Thêm
      </Button>
      <PhoneMenu />
    </header>
  );
}
