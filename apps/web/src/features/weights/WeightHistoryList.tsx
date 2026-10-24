import { MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { m } from '../../i18n';
import { IconButton } from '../../ui/IconButton';
import { formatDate, formatKg, formatSignedTenths, tenthsOf } from './format';
import type { WeightEntry } from './queries';

const t = m.weights;

function RowMenu({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const item = 'text-body hover:bg-surface-2 flex min-h-11 w-full items-center px-4 text-left';
  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<MoreVertical size={20} />}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      />
      {open && (
        <div
          role="menu"
          className="border-divider bg-surface shadow-overlay absolute top-11 right-0 z-20 min-w-32 rounded-md border py-1"
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
          >
            {t.edit}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
          >
            {t.delete}
          </button>
        </div>
      )}
    </div>
  );
}

/** Lịch sử số đo (mới nhất trước); chênh lệch so với số đo liền trước theo thời gian. */
export function WeightHistoryList({
  items,
  onEdit,
  onDelete,
}: {
  items: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entry: WeightEntry) => void;
}) {
  return (
    <section className="bg-surface border-divider rounded-xl border p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-caption text-text-muted uppercase">{t.historyTitle}</h2>
        <span className="text-small text-text-muted">{t.historyCount(items.length)}</span>
      </div>
      <ul className="divide-divider divide-y">
        {items.map((entry, i) => {
          const older = items[i + 1];
          const delta = older ? tenthsOf(entry.weightKg) - tenthsOf(older.weightKg) : null;
          const date = formatDate(entry.measuredOn);
          return (
            <li key={entry.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onEdit(entry);
                }}
                className="hover:bg-surface-2 flex min-h-14 flex-1 items-center gap-3 rounded-md px-2 text-left"
              >
                <span className="text-body text-text-muted w-24 shrink-0">{date}</span>
                <span className="text-body flex-1 font-bold">{formatKg(entry.weightKg)}</span>
                {delta !== null && (
                  <span className="text-small text-text-muted">{formatSignedTenths(delta)}</span>
                )}
              </button>
              <RowMenu
                label={t.options(date)}
                onEdit={() => {
                  onEdit(entry);
                }}
                onDelete={() => {
                  onDelete(entry);
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
