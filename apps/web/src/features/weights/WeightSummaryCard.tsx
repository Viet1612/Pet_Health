import { Target } from 'lucide-react';

import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { formatDate, formatDelta, formatKg } from './format';
import type { WeightsView } from './queries';

const t = m.weights;

/** Thẻ tóm tắt SCR-10: số đo gần nhất, chênh lệch, mục tiêu, nút thêm. */
export function WeightSummaryCard({
  view,
  onAdd,
  onEditTarget,
}: {
  view: WeightsView;
  onAdd: () => void;
  onEditTarget: () => void;
}) {
  const { latest, deltaFromPrevious, target } = view;
  return (
    <section className="bg-surface border-divider flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-caption text-text-muted uppercase">{t.latestLabel}</h2>
        {latest && (
          <span className="text-small text-text-muted">{formatDate(latest.measuredOn)}</span>
        )}
      </div>
      {latest && <p className="text-display">{formatKg(latest.weightKg)}</p>}
      {deltaFromPrevious !== null && (
        <p className="text-body text-text-muted">
          {t.deltaFromPrevious(formatDelta(deltaFromPrevious))}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {target ? (
          <>
            <span className="bg-primary-soft text-primary-soft-fg text-small inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold">
              <Target size={16} aria-hidden />
              {t.target(formatKg(target))}
            </span>
            <button
              type="button"
              onClick={onEditTarget}
              className="text-primary text-small min-h-11 font-semibold"
            >
              {t.editTarget}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onEditTarget}
            className="text-primary text-small min-h-11 font-semibold"
          >
            {t.setTarget}
          </button>
        )}
      </div>
      <Button fullWidth onClick={onAdd}>
        {t.add}
      </Button>
    </section>
  );
}
