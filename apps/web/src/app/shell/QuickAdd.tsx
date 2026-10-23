import { useQuery } from '@tanstack/react-query';
import { Plus, Scale } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useSelectedPet } from '../../features/pets';
import { useSession } from '../../features/session';
import { todayIn, WeightEntryDialog, weightsQuery } from '../../features/weights';
import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';

/**
 * Menu "+" Thêm nhanh (FLW-02): "+" → "Cân nặng" → gõ → "Lưu" (≤ 3 lần chạm). Ghi cho thú cưng
 * đang chọn. Phone: nút icon; ≥ 768: nút "+ Thêm".
 */
export function QuickAdd() {
  const { selected } = useSelectedPet();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const weights = useQuery({
    ...weightsQuery(selected?.id ?? ''),
    enabled: weightOpen && Boolean(selected),
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

  const toggle = () => {
    setMenuOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label={vi.topBar.quickAdd}
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
        {vi.topBar.quickAddLabel.replace('+ ', '')}
      </Button>
      {menuOpen && (
        <div
          role="menu"
          className="border-divider bg-surface shadow-overlay absolute top-12 right-0 z-50 min-w-48 rounded-md border py-1"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!selected}
            className="text-body hover:bg-surface-2 flex min-h-11 w-full items-center gap-3 px-4 disabled:opacity-50"
            onClick={() => {
              setMenuOpen(false);
              setWeightOpen(true);
            }}
          >
            <Scale size={20} aria-hidden />
            {selected ? vi.quickAdd.weight : vi.quickAdd.noPet}
          </button>
        </div>
      )}
      {weightOpen && selected && (
        <WeightEntryDialog
          petId={selected.id}
          petName={selected.name}
          target={weights.data?.target ?? null}
          today={todayIn(session?.user.timezone)}
          onClose={() => {
            setWeightOpen(false);
          }}
        />
      )}
    </div>
  );
}
