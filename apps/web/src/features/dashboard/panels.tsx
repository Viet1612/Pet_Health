import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { m } from '../../i18n';
import { formatDate } from '../../lib/format';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { MilestoneTypeIcon, StatusChip, typeLabel } from '../milestones';
import { RoutineChecklist } from '../routines';
import { buildChartData, formatDelta, formatKg, WeightChart } from '../weights';
import type { DashboardData, DashboardMilestone, DashboardWeight } from './queries';

const t = m.dashboard;

/** Khung panel: `<section aria-labelledby>`, tiêu đề chữ hoa + phần phải. */
function Panel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cx('bg-surface shadow-card rounded-lg p-4', className)}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id} className="text-caption text-text-muted font-semibold uppercase">
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

const linkClass = 'text-small text-primary inline-flex min-h-11 items-center font-semibold';

export function RoutinesPanel({
  routines,
  all,
  manageTo,
  onAdd,
  className,
}: {
  routines: DashboardData['routines'];
  all: boolean;
  /** SCR-16 của thú cưng đang chọn (lọc "Tất cả": thú cưng đầu tiên). */
  manageTo: string | null;
  onAdd: () => void;
  className?: string;
}) {
  return (
    <Panel
      title={all ? t.routinesTitleAll : t.routinesTitle}
      className={className}
      aside={
        routines.totalCount > 0 && (
          <span className="text-small text-primary font-semibold">
            {m.routines.progress(routines.doneCount, routines.totalCount)}
          </span>
        )
      }
    >
      {routines.totalCount === 0 ? (
        <p className="text-body text-text-muted">{m.routines.emptyDescription}</p>
      ) : (
        <RoutineChecklist
          items={routines.items}
          {...(all
            ? {
                metaOf: (item) =>
                  routines.items.find((r) => r.id === item.id)?.petName ?? undefined,
              }
            : {})}
        />
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" onClick={onAdd}>
          {m.routines.add}
        </Button>
        {manageTo && routines.totalCount > 0 && (
          <Link to={manageTo as never} className={linkClass}>
            {t.manageRoutines}
          </Link>
        )}
      </div>
    </Panel>
  );
}

function MilestoneRow({
  item,
  all,
  onComplete,
}: {
  item: DashboardMilestone;
  all: boolean;
  onComplete: (item: DashboardMilestone) => void;
}) {
  const base = item.note ? `${typeLabel(item.type)} · ${item.note}` : typeLabel(item.type);
  const title = all ? `${base} · ${item.petName}` : base;
  return (
    <li className="flex items-center gap-3 py-2">
      <MilestoneTypeIcon type={item.type} />
      <Link
        to="/milestones/$milestoneId"
        params={{ milestoneId: item.id }}
        className="min-w-0 flex-1"
      >
        <span className="text-body block truncate font-semibold">{title}</span>
        <span className="text-small text-text-muted block">
          {m.milestones.due(formatDate(item.dueOn))}
        </span>
        <span className="mt-1 block">
          <StatusChip
            milestone={{
              status: 'PENDING',
              doneOn: null,
              daysUntilDue: item.daysUntilDue,
              dueOn: item.dueOn,
            }}
          />
        </span>
      </Link>
      <button
        type="button"
        aria-label={m.milestones.markDone(base)}
        onClick={() => {
          onComplete(item);
        }}
        className="border-primary text-primary hover:bg-primary hover:text-on-primary inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2"
      >
        <Check size={20} aria-hidden />
      </button>
    </li>
  );
}

export function MilestonesPanel({
  items,
  all,
  viewAllTo,
  onComplete,
  onCreate,
  className,
}: {
  items: DashboardMilestone[];
  all: boolean;
  viewAllTo: string | null;
  onComplete: (item: DashboardMilestone) => void;
  onCreate: () => void;
  className?: string;
}) {
  return (
    <Panel
      title={all ? t.milestonesTitleAll : t.milestonesTitle}
      className={className}
      aside={
        viewAllTo && (
          <Link to={viewAllTo as never} className={linkClass}>
            {t.viewAll}
          </Link>
        )
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-body text-text-muted">{m.milestones.emptyUpcoming}</p>
          <Button variant="secondary" onClick={onCreate}>
            {m.milestones.emptyUpcomingAction}
          </Button>
        </div>
      ) : (
        <ul className="divide-divider m-0 list-none divide-y p-0">
          {items.map((item) => (
            <MilestoneRow key={item.id} item={item} all={all} onComplete={onComplete} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function WeightPanel({
  weight,
  all,
  onAdd,
  className,
}: {
  weight: DashboardWeight;
  all: boolean;
  onAdd: () => void;
  className?: string;
}) {
  const data = buildChartData(
    weight.series.map((p) => ({ ...p, id: p.measuredOn, createdAt: '' })),
  );
  const target = weight.target === null ? null : Number(weight.target);
  return (
    <Panel
      title={all ? t.weightTitleOf(weight.petName) : t.weightTitle}
      className={className}
      aside={
        weight.target && (
          <span className="text-small text-text-muted">
            {m.weights.target(formatKg(weight.target))}
          </span>
        )
      }
    >
      {weight.latest ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-h1">{formatKg(weight.latest.weightKg)}</span>
            {weight.latest.delta && (
              <span className="text-small text-text-muted">
                {m.weights.deltaFromPrevious(formatDelta(weight.latest.delta))}
              </span>
            )}
          </p>
          {data && data.points.length > 1 && (
            <div className="mt-2">
              <WeightChart
                data={data}
                target={target}
                caption={m.weights.chartCaption(
                  weight.petName,
                  weight.target ? formatKg(weight.target) : null,
                )}
                compact
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-body text-text-muted">{t.weightEmpty}</p>
      )}
      <div className="mt-2">
        <Button variant="secondary" onClick={onAdd}>
          {weight.latest ? t.addWeight : m.weights.add}
        </Button>
      </div>
    </Panel>
  );
}
