import { useRouterState } from '@tanstack/react-router';
import { Bell, Menu, Plus } from 'lucide-react';

import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';

/** CMP-07: chuông (S0 chỉ hiển thị; số chưa xem ở S4-05). */
function BellButton() {
  return <IconButton aria-label={vi.topBar.notifications} icon={<Bell size={24} />} />;
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
      {/* Khe cho PetSwitcher (CMP-04, S2-04) */}
      <div className="min-w-0 flex-1" data-slot="pet-switcher" />
      <BellButton />
      <IconButton aria-label={vi.topBar.quickAdd} icon={<Plus size={24} />} className="md:hidden" />
      <Button variant="primary" icon={<Plus size={20} />} className="hidden md:inline-flex">
        Thêm
      </Button>
      <IconButton aria-label={vi.topBar.menu} icon={<Menu size={24} />} className="md:hidden" />
    </header>
  );
}
