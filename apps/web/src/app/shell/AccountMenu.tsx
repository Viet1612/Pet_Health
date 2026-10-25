import { useNavigate } from '@tanstack/react-router';
import { LogOut, Menu, PawPrint, Settings } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { useLogoutAction, useSession } from '../../features/session';
import { offsetOf } from '../../features/settings';
import { m } from '../../i18n';
import { IconButton } from '../../ui/IconButton';

/**
 * Menu tài khoản trên phone (21:2394): email + múi giờ, Cài đặt, Thú cưng của tôi, Đăng xuất.
 * `role="menu"`: ↑/↓/Home/End di chuyển, Esc đóng và trả focus về nút ☰.
 */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const navigate = useNavigate();
  const logout = useLogoutAction();
  const { data: session } = useSession();

  useEffect(() => {
    if (!open) return;
    itemsRef.current[0]?.focus();
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = itemsRef.current.filter((el): el is HTMLButtonElement => el !== null);
    const index = items.findIndex((el) => el === document.activeElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    } else if (e.key === 'ArrowDown') go(index + 1);
    else if (e.key === 'ArrowUp') go(index - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
  };

  const item = 'text-body hover:bg-surface-2 flex min-h-11 w-full items-center gap-3 px-4';
  const entries = [
    {
      icon: <Settings size={20} aria-hidden />,
      label: m.nav.settings,
      run: () => void navigate({ to: '/settings' }),
    },
    {
      icon: <PawPrint size={20} aria-hidden />,
      label: m.settings.menu.myPets,
      run: () => void navigate({ to: '/pets' }),
    },
  ];

  return (
    <div ref={ref} className="relative md:hidden">
      <IconButton
        ref={buttonRef}
        aria-label={m.topBar.menu}
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
          aria-label={m.topBar.menu}
          onKeyDown={onKeyDown}
          className="border-divider bg-surface absolute top-12 right-0 z-50 min-w-60 rounded-md border py-1 shadow-lg"
        >
          {session && (
            <div className="border-divider border-b px-4 py-2">
              <p className="text-body truncate font-semibold">{session.user.email}</p>
              <p className="text-small text-text-muted">
                {m.settings.menu.timezone(offsetOf(session.user.timezone))}
              </p>
            </div>
          )}
          {entries.map((entry, i) => (
            <button
              key={entry.label}
              ref={(el) => {
                itemsRef.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={item}
              onClick={() => {
                setOpen(false);
                entry.run();
              }}
            >
              {entry.icon}
              {entry.label}
            </button>
          ))}
          <hr className="border-divider my-1" />
          <button
            ref={(el) => {
              itemsRef.current[entries.length] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={logout.isPending}
            className={`${item} text-danger`}
            onClick={() => void logout.run()}
          >
            <LogOut size={20} aria-hidden />
            {m.auth.logout}
          </button>
        </div>
      )}
    </div>
  );
}
