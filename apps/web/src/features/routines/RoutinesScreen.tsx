import { useQuery } from '@tanstack/react-query';
import { ListChecks, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { m } from '../../i18n';
import { formatDayMonth } from '../../lib/format';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { IconButton } from '../../ui/IconButton';
import { Skeleton } from '../../ui/Skeleton';
import { RoutineChecklist } from './RoutineChecklist';
import { DeleteRoutineDialog, RoutineFormDialog } from './RoutineFormDialog';
import { routinesQuery, type Routine } from './queries';

const t = m.routines;
export const MAX_ROUTINES = 20;

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
        onClick={() => {
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
            onClick={() => {
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
            onClick={() => {
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

type Dialog =
  { kind: 'add' } | { kind: 'edit'; routine: Routine } | { kind: 'delete'; routine: Routine };

/**
 * SCR-16 · Việc hằng ngày (11:1490). Phone: card Hôm nay rồi card Danh sách; ≥ 768 px: 2 cột.
 * `addOpen` (search `?add=1`) mở thẳng sheet Thêm việc.
 */
export function RoutinesScreen({
  petId,
  petName,
  addOpen,
  onAddClosed,
}: {
  petId: string;
  petName: string;
  addOpen: boolean;
  onAddClosed: () => void;
}) {
  const query = useQuery(routinesQuery(petId));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const shown: Dialog | null = dialog ?? (addOpen ? { kind: 'add' } : null);
  const close = () => {
    setDialog(null);
    if (addOpen) onAddClosed();
  };

  if (query.isPending) {
    return (
      <div aria-busy="true" className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="bg-surface flex flex-col gap-2 rounded-lg p-4">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-14" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState kind="server" onRetry={() => void query.refetch()} />;

  const data = query.data;
  const full = data.totalCount >= MAX_ROUTINES;
  const addButton = (
    <Button
      variant="secondary"
      disabled={full}
      onClick={() => {
        setDialog({ kind: 'add' });
      }}
    >
      {t.add}
    </Button>
  );

  return (
    <>
      {data.totalCount === 0 ? (
        <EmptyState
          icon={<ListChecks size={28} />}
          title={t.emptyTitle}
          description={t.emptyDescription}
          action={addButton}
        />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Card
            title={<span className="uppercase">{t.today(formatDayMonth(data.today))}</span>}
            action={
              <span className="text-small text-primary font-semibold">
                {t.progress(data.doneCount, data.totalCount)}
              </span>
            }
          >
            <RoutineChecklist items={data.items} petId={petId} />
          </Card>
          <Card
            title={<span className="uppercase">{t.listTitle}</span>}
            action={
              <span className="text-small text-text-muted">{t.listCount(data.totalCount)}</span>
            }
          >
            <ul className="m-0 flex list-none flex-col p-0">
              {[...data.items]
                .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
                .map((r) => (
                  <li key={r.id} className="flex min-h-14 items-center gap-3">
                    <span className="bg-primary-soft text-primary-soft-fg text-small rounded-full px-2 py-0.5 font-semibold tabular-nums">
                      {r.timeOfDay}
                    </span>
                    <span className="text-body min-w-0 flex-1 truncate">{r.name}</span>
                    <RowMenu
                      label={t.options(r.name)}
                      onEdit={() => {
                        setDialog({ kind: 'edit', routine: r });
                      }}
                      onDelete={() => {
                        setDialog({ kind: 'delete', routine: r });
                      }}
                    />
                  </li>
                ))}
            </ul>
            <div className="mt-2 flex flex-col gap-1">
              {addButton}
              {full && <p className="text-small text-text-muted">{t.limitReached}</p>}
            </div>
          </Card>
        </div>
      )}

      {shown?.kind === 'add' && !full && (
        <RoutineFormDialog petId={petId} petName={petName} onClose={close} />
      )}
      {shown?.kind === 'edit' && (
        <RoutineFormDialog
          petId={petId}
          petName={petName}
          routine={shown.routine}
          onClose={close}
        />
      )}
      {shown?.kind === 'delete' && (
        <DeleteRoutineDialog petId={petId} routine={shown.routine} onClose={close} />
      )}
    </>
  );
}
