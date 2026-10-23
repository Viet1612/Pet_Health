import { useSuspenseQuery } from '@tanstack/react-query';
import { Scale } from 'lucide-react';
import { useMemo, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { useToast } from '../../ui/toast';
import { buildChartData } from './chart-data';
import { formatDate, formatKg, tenthsOf } from './format';
import { useDeleteWeight, weightsQuery, type WeightEntry } from './queries';
import { WeightChart } from './WeightChart';
import { WeightEntryDialog } from './WeightEntryDialog';
import { WeightHistoryList } from './WeightHistoryList';
import { WeightSummaryCard } from './WeightSummaryCard';
import { WeightTargetDialog } from './WeightTargetDialog';

const t = vi.weights;

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; entry: WeightEntry }
  | { kind: 'target' }
  | { kind: 'delete'; entry: WeightEntry }
  | null;

/** SCR-10 · Sức khỏe / Cân nặng (10:576). */
export function WeightScreen({
  petId,
  petName,
  today,
}: {
  petId: string;
  petName: string;
  today: string;
}) {
  const { data: view } = useSuspenseQuery(weightsQuery(petId));
  const toast = useToast();
  const remove = useDeleteWeight(petId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => {
    setDialog(null);
  };
  const chartData = useMemo(() => buildChartData(view.items), [view.items]);
  const targetNum = view.target === null ? null : tenthsOf(view.target) / 10;

  const dialogs = (
    <>
      {(dialog?.kind === 'add' || dialog?.kind === 'edit') && (
        <WeightEntryDialog
          petId={petId}
          petName={petName}
          target={view.target}
          today={today}
          {...(dialog.kind === 'edit' ? { entry: dialog.entry } : {})}
          onClose={close}
        />
      )}
      {dialog?.kind === 'target' && (
        <WeightTargetDialog petId={petId} petName={petName} target={view.target} onClose={close} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          title={t.deleteConfirm(
            formatKg(dialog.entry.weightKg),
            formatDate(dialog.entry.measuredOn),
          )}
          confirmLabel={t.delete}
          loading={remove.isPending}
          onClose={close}
          onConfirm={() => {
            remove.mutate(dialog.entry.id, {
              onSuccess: () => {
                close();
                toast.show({ kind: 'success', message: t.deleted });
              },
              onError: (err) => {
                const m = toUserMessage(err);
                toast.show({
                  kind: 'error',
                  message: 'message' in m ? m.message : vi.error.serverToast,
                });
              },
            });
          }}
        />
      )}
    </>
  );

  if (view.items.length === 0 || !chartData) {
    return (
      <>
        <EmptyState
          icon={<Scale size={32} />}
          title={t.emptyTitle}
          description={t.emptyDescription}
          action={
            <Button
              onClick={() => {
                setDialog({ kind: 'add' });
              }}
            >
              {t.add}
            </Button>
          }
        />
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-[300px_1fr] md:items-start">
        <WeightSummaryCard
          view={view}
          onAdd={() => {
            setDialog({ kind: 'add' });
          }}
          onEditTarget={() => {
            setDialog({ kind: 'target' });
          }}
        />
        <section className="bg-surface border-divider min-w-0 rounded-xl border p-4">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 className="text-caption text-text-muted uppercase">{t.trendTitle}</h2>
            {view.target && <span className="text-small text-text-muted">{t.dashedIsTarget}</span>}
          </div>
          <WeightChart
            data={chartData}
            target={targetNum}
            caption={t.chartCaption(petName, view.target ? formatKg(view.target) : null)}
          />
          {view.items.length === 1 && (
            <p className="text-small text-text-muted mt-2">{t.oneEntryHint}</p>
          )}
        </section>
      </div>
      <WeightHistoryList
        items={view.items}
        onEdit={(entry) => {
          setDialog({ kind: 'edit', entry });
        }}
        onDelete={(entry) => {
          setDialog({ kind: 'delete', entry });
        }}
      />
      {dialogs}
    </div>
  );
}
