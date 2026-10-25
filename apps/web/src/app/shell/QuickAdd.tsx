import { useQuery } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { CalendarClock, ListChecks, NotebookPen, Plus, Scale } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { MilestoneFormDialog } from '../../features/milestones';
import { PetPickDialog, useSelectedPet } from '../../features/pets';
import { RoutineFormDialog } from '../../features/routines';
import { useSession } from '../../features/session';
import { todayIn, WeightEntryDialog, weightsQuery } from '../../features/weights';
import { m } from '../../i18n';
import { useDashboardFilter } from '../../lib/dashboard-filter';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';

type Action = 'weight' | 'visit' | 'milestone' | 'routine';
interface PetRef {
  id: string;
  name: string;
}

/**
 * Menu "+" Thêm nhanh (UXD-004): Cân nặng, Lần khám, Mốc y tế, Việc hằng ngày cho thú cưng đang
 * chọn; ≤ 2 chạm tới form. Dashboard đang lọc "Tất cả" → chọn thú cưng trước. Ẩn khi chưa có thú
 * cưng. Phone: nút icon; ≥ 768: nút "+ Thêm".
 */
export function QuickAdd() {
  const { pets, selected } = useSelectedPet();
  const { data: session } = useSession();
  const filter = useDashboardFilter();
  const onDashboard = useRouterState({ select: (s) => s.location.pathname === '/' });
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<{ action: Action; pet?: PetRef } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const pet = pending?.pet;
  const weights = useQuery({
    ...weightsQuery(pet?.id ?? ''),
    enabled: pending?.action === 'weight' && Boolean(pet),
  });

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  if (!pets || pets.length === 0 || !selected) return null;

  const askPet = onDashboard && filter === 'all' && pets.length > 1;
  const run = (action: Action, target: PetRef) => {
    if (action === 'visit') {
      setPending(null);
      void navigate({ to: '/pets/$petId/visits/new', params: { petId: target.id } });
      return;
    }
    setPending({ action, pet: target });
  };
  const choose = (action: Action) => {
    setMenuOpen(false);
    if (askPet) setPending({ action });
    else run(action, selected);
  };
  const close = () => {
    setPending(null);
  };
  const today = todayIn(session?.user.timezone);

  const toggle = () => {
    setMenuOpen((v) => !v);
  };
  const item = (action: Action, icon: ReactNode, label: string) => (
    <button
      key={action}
      type="button"
      role="menuitem"
      className="text-body hover:bg-surface-2 flex min-h-11 w-full items-center gap-3 px-4"
      onClick={() => {
        choose(action);
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label={m.topBar.quickAdd}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        icon={<Plus size={24} />}
        className="md:hidden"
        onClick={toggle}
      />
      <Button
        icon={<Plus size={20} />}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="hidden md:inline-flex"
        onClick={toggle}
      >
        {m.topBar.quickAddLabel.replace('+ ', '')}
      </Button>
      {menuOpen && (
        <div
          role="menu"
          className="border-divider bg-surface shadow-overlay absolute top-12 right-0 z-50 min-w-52 rounded-md border py-1"
        >
          {item('weight', <Scale size={20} aria-hidden />, m.quickAdd.weight)}
          {item('visit', <NotebookPen size={20} aria-hidden />, m.quickAdd.visit)}
          {item('milestone', <CalendarClock size={20} aria-hidden />, m.quickAdd.milestone)}
          {item('routine', <ListChecks size={20} aria-hidden />, m.quickAdd.routine)}
        </div>
      )}

      {pending && !pet && (
        <PetPickDialog
          pets={pets}
          onClose={close}
          onPick={(p) => {
            run(pending.action, p);
          }}
        />
      )}
      {pending?.action === 'weight' && pet && (
        <WeightEntryDialog
          petId={pet.id}
          petName={pet.name}
          target={weights.data?.target ?? null}
          today={today}
          onClose={close}
        />
      )}
      {pending?.action === 'milestone' && pet && (
        <MilestoneFormDialog petId={pet.id} petName={pet.name} today={today} onClose={close} />
      )}
      {pending?.action === 'routine' && pet && (
        <RoutineFormDialog petId={pet.id} petName={pet.name} onClose={close} />
      )}
    </div>
  );
}
