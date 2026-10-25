import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Check, ChevronDown, LayoutGrid, Plus } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';

import { m } from '../../i18n';
import {
  prefetchDashboard,
  setDashboardFilter,
  useDashboardFilter,
} from '../../lib/dashboard-filter';
import { buttonClassName } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { PetAvatar } from './PetAvatar';
import { PET_LIMIT } from './queries';
import { useSelectedPet } from './use-selected-pet';

const t = m.pets;

/** Một lựa chọn trong sheet: một thú cưng, hoặc "Tất cả" (chỉ ở Dashboard, US-061). */
const ALL = 'all';

/**
 * CMP-04 PetSwitcher (21:2115): nút trong TopBar mở sheet chọn thú cưng. Đổi thú cưng trên route
 * có `:petId` → sang cùng route của con mới. 0 thú cưng → nút "+ Thêm thú cưng". Ở Dashboard có
 * thêm "Tất cả" và lựa chọn đồng bộ với bộ lọc Dashboard.
 */
export function PetSwitcher() {
  const { pets, selected, select } = useSelectedPet();
  const router = useRouter();
  const routePetId = useRouterState({
    select: (s) => {
      for (const m of s.matches) {
        const params = m.params as Record<string, string | undefined>;
        if (params.petId) return params.petId;
      }
      return undefined;
    },
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const filter = useDashboardFilter();
  const onDashboard = pathname === '/';
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  if (!pets) return null;
  if (pets.length === 0) {
    return (
      <Link to="/pets/new" className={cx(buttonClassName('ghost'), 'min-w-0')}>
        <Plus size={20} aria-hidden />
        <span className="truncate">{t.add.replace('+ ', '')}</span>
      </Link>
    );
  }
  const current = selected ?? pets[0];
  if (!current) return null;
  const full = pets.length >= PET_LIMIT;
  const showAll = onDashboard && pets.length > 1;
  const allSelected = showAll && filter === ALL;
  const options = showAll ? [ALL, ...pets.map((p) => p.id)] : pets.map((p) => p.id);
  const selectedId = allSelected ? ALL : current.id;

  const choose = (id: string) => {
    setOpen(false);
    if (id === ALL) {
      setDashboardFilter(ALL);
      return;
    }
    select(id);
    setDashboardFilter(id);
    if (routePetId && routePetId !== id) {
      router.history.push(pathname.replace(routePetId, id));
    }
  };

  const focusOption = (index: number) => {
    const next = (index + options.length) % options.length;
    setActive(next);
    optionRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusOption(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusOption(active - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const id = options[active];
      if (id) choose(id);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="listbox"
        onClick={() => {
          const index = Math.max(0, options.indexOf(selectedId));
          // Ở Dashboard: tải trước dữ liệu các lựa chọn khác để chọn là hiện ngay.
          if (onDashboard) prefetchDashboard(options.filter((o) => o !== selectedId));
          setActive(index);
          setOpen(true);
          requestAnimationFrame(() => optionRefs.current[index]?.focus());
        }}
        className="hover:bg-surface-2 flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full px-2"
      >
        {allSelected ? (
          <LayoutGrid size={22} aria-hidden className="shrink-0" />
        ) : (
          <PetAvatar pet={current} size={24} />
        )}
        <span className="text-body min-w-0 truncate font-semibold">
          <span className="sr-only">{t.switcher.openPrefix}</span>
          {allSelected ? m.dashboard.all : current.name}
          <span className="sr-only">{t.switcher.openSuffix}</span>
        </span>
        <ChevronDown size={18} aria-hidden className="shrink-0" />
      </button>

      <ResponsiveDialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title={t.switcher.label}
      >
        <p className="text-small text-text-muted mb-2">{t.count(pets.length)}</p>
        <ul
          role="listbox"
          aria-label={t.switcher.label}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-1"
        >
          {showAll && (
            <li
              ref={(el) => {
                optionRefs.current[0] = el;
              }}
              role="option"
              aria-selected={allSelected}
              tabIndex={active === 0 ? 0 : -1}
              onClick={() => {
                choose(ALL);
              }}
              className={cx(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-3 py-2',
                allSelected ? 'bg-primary-soft' : 'hover:bg-surface-2',
              )}
            >
              <span
                aria-hidden
                className="bg-surface-2 flex size-8 shrink-0 items-center justify-center rounded-full"
              >
                <LayoutGrid size={18} />
              </span>
              <span className="text-body min-w-0 flex-1 font-semibold">{m.dashboard.all}</span>
              {allSelected && <Check size={20} aria-hidden className="text-primary shrink-0" />}
            </li>
          )}
          {pets.map((pet, i) => {
            const index = showAll ? i + 1 : i;
            const isSelected = !allSelected && pet.id === current.id;
            return (
              <li
                key={pet.id}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                role="option"
                aria-selected={isSelected}
                tabIndex={index === active ? 0 : -1}
                onClick={() => {
                  choose(pet.id);
                }}
                className={cx(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-3 py-2',
                  isSelected ? 'bg-primary-soft' : 'hover:bg-surface-2',
                )}
              >
                <PetAvatar pet={pet} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="text-body block truncate font-semibold">{pet.name}</span>
                  <span className="text-small text-text-muted block truncate">
                    {m.pets.age(pet.ageMonths)} · {pet.breed}
                  </span>
                </span>
                {isSelected && <Check size={20} aria-hidden className="text-primary shrink-0" />}
              </li>
            );
          })}
        </ul>
        <div className="border-divider mt-2 border-t pt-2">
          {full ? (
            <p className="text-small text-text-muted flex min-h-11 items-center gap-2 px-3 opacity-70">
              <Plus size={20} aria-hidden />
              {t.limitReached}
            </p>
          ) : (
            <Link
              to="/pets/new"
              onClick={() => {
                setOpen(false);
              }}
              className="text-primary text-body hover:bg-surface-2 flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold"
            >
              {t.add}
            </Link>
          )}
        </div>
      </ResponsiveDialog>
    </>
  );
}
