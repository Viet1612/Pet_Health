import { useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';

import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { EmptyState } from '../../ui/EmptyState';
import { Skeleton } from '../../ui/Skeleton';
import { CompleteMilestoneDialog } from './complete-flow';
import { MilestoneItem } from './components';
import { MilestoneFormDialog } from './MilestoneFormDialog';
import { milestonesQuery, type Milestone } from './queries';

const t = vi.milestones;

export type MilestoneTab = 'upcoming' | 'overdue' | 'done' | 'cancelled';
export const MILESTONE_TABS: MilestoneTab[] = ['upcoming', 'overdue', 'done', 'cancelled'];

/**
 * SCR-14 · Lịch mốc y tế (11:999): segmented 4 nhóm (mặc định Quá hạn nếu có, ngược lại Sắp tới),
 * nút ✓ mở FLW-04, "+ Tạo mốc".
 */
export function MilestoneList({
  petId,
  petName,
  tab,
  onTabChange,
  selectedId,
}: {
  petId: string;
  petName: string;
  tab: MilestoneTab | undefined;
  onTabChange: (tab: MilestoneTab) => void;
  selectedId?: string;
}) {
  const { data, isPending } = useQuery(milestonesQuery(petId));
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<Milestone | null>(null);

  if (isPending || !data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <Skeleton shape="list-item" className="h-20" />
        <Skeleton shape="list-item" className="h-20" />
        <Skeleton shape="list-item" className="h-20" />
      </div>
    );
  }
  const active: MilestoneTab = tab ?? (data.overdue.length ? 'overdue' : 'upcoming');
  const labels: Record<MilestoneTab, string> = {
    upcoming: t.tabs.upcoming(data.upcoming.length),
    overdue: t.tabs.overdue(data.overdue.length),
    done: t.tabs.done,
    cancelled: t.tabs.cancelled,
  };
  const items = data[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1">{t.title}</h1>
        <Button
          onClick={() => {
            setCreating(true);
          }}
        >
          {t.create}
        </Button>
      </div>
      <div
        role="tablist"
        aria-label={t.title}
        className="border-border flex overflow-x-auto rounded-md border p-1"
      >
        {MILESTONE_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => {
              onTabChange(key);
            }}
            className={cx(
              'text-small min-h-10 flex-1 rounded-sm px-2 font-semibold whitespace-nowrap',
              active === key ? 'bg-primary text-on-primary' : 'hover:bg-surface-2',
            )}
          >
            {labels[key]}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        active === 'upcoming' ? (
          <EmptyState
            icon={<CalendarCheck size={32} />}
            title={t.emptyUpcoming}
            action={
              <Button
                onClick={() => {
                  setCreating(true);
                }}
              >
                {t.emptyUpcomingAction}
              </Button>
            }
          />
        ) : (
          <p className="text-body text-text-muted py-8 text-center">{t.emptyOther}</p>
        )
      ) : (
        <ul role="tabpanel" className="flex flex-col gap-2">
          {items.map((m) => (
            <li key={m.id}>
              <MilestoneItem
                milestone={m}
                selected={m.id === selectedId}
                onComplete={setCompleting}
              />
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <MilestoneFormDialog
          petId={petId}
          petName={petName}
          today={data.today}
          onClose={() => {
            setCreating(false);
          }}
        />
      )}
      {completing && (
        <CompleteMilestoneDialog
          petId={petId}
          petName={petName}
          milestone={completing}
          today={data.today}
          onClose={() => {
            setCompleting(null);
          }}
        />
      )}
    </div>
  );
}
