import { useRouterState } from '@tanstack/react-router';

import { BellButton } from '../../features/notifications';
import { PetSwitcher } from '../../features/pets';
import { AccountMenu } from './AccountMenu';
import { QuickAdd } from './QuickAdd';

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
      <QuickAdd />
      <AccountMenu />
    </header>
  );
}
