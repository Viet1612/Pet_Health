import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Droplet,
  Pill,
  Syringe,
  XCircle,
} from 'lucide-react';

import { m } from '../../i18n';
import { cx } from '../../ui/cx';
import { dueLine, milestoneTitle, statusChip, type ChipTone } from './format';
import type { Milestone, MilestoneType } from './queries';

const TYPE_ICON = { VACCINE: Syringe, FLEA: Droplet, DEWORM: Pill } as const;

/** Icon loại mốc trong vòng tròn primary-soft. */
export function MilestoneTypeIcon({ type, size = 40 }: { type: MilestoneType; size?: 40 | 48 }) {
  const Icon = TYPE_ICON[type];
  return (
    <span
      aria-hidden
      className={cx(
        'bg-primary-soft text-primary-soft-fg inline-flex shrink-0 items-center justify-center rounded-full',
        size === 48 ? 'size-12' : 'size-10',
      )}
    >
      <Icon size={size === 48 ? 24 : 20} />
    </span>
  );
}

const TONE: Record<ChipTone, string> = {
  danger: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  neutral: 'bg-neutral-bg text-neutral',
  success: 'bg-success-bg text-success',
  cancelled: 'bg-neutral-bg text-neutral line-through',
};
const TONE_ICON: Record<ChipTone, typeof Clock> = {
  danger: AlertTriangle,
  warning: Clock,
  neutral: Clock,
  success: CheckCircle2,
  cancelled: XCircle,
};

/** StatusChip: luôn có icon + chữ (không chỉ dựa vào màu). */
export function StatusChip({ milestone }: { milestone: Milestone }) {
  const { tone, label } = statusChip(milestone);
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={cx(
        'text-caption inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap',
        TONE[tone],
      )}
    >
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

/** Một dòng mốc ở SCR-14: chạm → chi tiết; nút ✓ chỉ với mốc PENDING. */
export function MilestoneItem({
  milestone,
  selected,
  onComplete,
}: {
  milestone: Milestone;
  selected?: boolean;
  onComplete: (m: Milestone) => void;
}) {
  const title = milestoneTitle(milestone);
  return (
    <div
      className={cx(
        'bg-surface flex items-center gap-3 rounded-lg border p-3',
        selected ? 'border-primary bg-primary-soft' : 'border-divider',
      )}
    >
      <Link
        to="/milestones/$milestoneId"
        params={{ milestoneId: milestone.id }}
        aria-current={selected ? 'page' : undefined}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <MilestoneTypeIcon type={milestone.type} />
        <span className="min-w-0 flex-1">
          <span className="text-body block truncate font-semibold">{title}</span>
          <span className="text-small text-text-muted block truncate">{dueLine(milestone)}</span>
          <span className="mt-1 block">
            <StatusChip milestone={milestone} />
          </span>
        </span>
      </Link>
      {milestone.status === 'PENDING' && (
        <button
          type="button"
          aria-label={m.milestones.markDone(title)}
          onClick={() => {
            onComplete(milestone);
          }}
          className="border-primary text-primary hover:bg-primary hover:text-on-primary inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2"
        >
          <Check size={20} aria-hidden />
        </button>
      )}
    </div>
  );
}
