import { Link } from '@tanstack/react-router';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { cx } from '../../ui/cx';
import { IconButton } from '../../ui/IconButton';
import { useToast } from '../../ui/toast';
import { CompleteMilestoneDialog } from './complete-flow';
import { MilestoneTypeIcon, StatusChip } from './components';
import { formatDate, formatDayMonth, milestoneTitle } from './format';
import { MilestoneFormDialog } from './MilestoneFormDialog';
import { useCancelMilestone, type MilestoneDetail as Detail } from './queries';

const t = m.milestones.detail;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-divider flex flex-col gap-0.5 border-b py-2 last:border-0 sm:flex-row sm:gap-4">
      <dt className="text-small text-text-muted sm:w-36 sm:shrink-0">{label}</dt>
      <dd className="text-body m-0">{children}</dd>
    </div>
  );
}

/**
 * SCR-15 · Chi tiết mốc (11:1195). `highlight` (mở từ thông báo) → cuộn tới khối hành động và tô
 * nền 1 s (bỏ hiệu ứng khi giảm chuyển động).
 */
export function MilestoneDetail({ detail, highlight }: { detail: Detail; highlight?: boolean }) {
  const { milestone, petName, today } = detail;
  const toast = useToast();
  const cancel = useCancelMilestone(milestone.petId, milestone.id);
  const [dialog, setDialog] = useState<'edit' | 'cancel' | 'complete' | null>(null);
  const [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const pending = milestone.status === 'PENDING';
  const title = milestoneTitle(milestone);

  useEffect(() => {
    if (!highlight || !pending) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    actionsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (reduce) return;
    const start = setTimeout(() => {
      setFlash(true);
    }, 0);
    const stop = setTimeout(() => {
      setFlash(false);
    }, 1000);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [highlight, pending]);

  const cycle =
    milestone.type === 'VACCINE'
      ? t.cycleVaccine
      : milestone.cycleMonths
        ? t.cycleEvery(milestone.cycleMonths)
        : t.cycleNone;
  const origin =
    milestone.origin === 'AUTO'
      ? detail.previousDoneOn
        ? t.originAuto(formatDate(detail.previousDoneOn))
        : t.originAutoNoDate
      : t.originManual;

  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          to="/pets/$petId/milestones"
          params={{ petId: milestone.petId }}
          aria-label={t.back}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full md:hidden"
        >
          <ArrowLeft size={24} aria-hidden />
        </Link>
        <p className="text-h2 flex-1">{t.title}</p>
        {pending && (
          <div className="relative">
            <IconButton
              aria-label={t.options}
              aria-haspopup="menu"
              aria-expanded={menu}
              icon={<MoreVertical size={22} />}
              onClick={() => {
                setMenu((v) => !v);
              }}
            />
            {menu && (
              <div
                role="menu"
                className="border-divider bg-surface shadow-overlay absolute top-11 right-0 z-20 min-w-36 rounded-md border py-1"
              >
                {(['edit', 'cancel'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="menuitem"
                    className={cx(
                      'text-body hover:bg-surface-2 flex min-h-11 w-full items-center px-4 text-left',
                      k === 'cancel' && 'text-danger',
                    )}
                    onClick={() => {
                      setMenu(false);
                      setDialog(k);
                    }}
                  >
                    {k === 'edit' ? t.edit : t.cancel}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <header className="flex items-center gap-3">
        <MilestoneTypeIcon type={milestone.type} size={48} />
        <div className="min-w-0">
          <h1 className="text-h1 break-words">{title}</h1>
          <StatusChip milestone={milestone} />
        </div>
      </header>

      <dl className="bg-surface border-divider m-0 rounded-xl border px-4 py-2">
        <Row label={t.pet}>{petName}</Row>
        <Row label={t.dueOn}>{formatDate(milestone.dueOn)}</Row>
        {milestone.note && <Row label={t.note}>{milestone.note}</Row>}
        <Row label={t.cycle}>{cycle}</Row>
        <Row label={t.origin}>{origin}</Row>
        {milestone.doneOn && <Row label={t.doneOn}>{formatDate(milestone.doneOn)}</Row>}
        <Row label={t.reminders}>
          {detail.reminders.length === 0 ? (
            <span className="text-text-muted">{t.noReminders}</span>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {detail.reminders.map((r) => (
                <li key={r.level}>
                  {t.reminderLevel[r.level]}: {formatDayMonth(r.appearOn)}
                  {t.reminderState[r.state]}
                </li>
              ))}
            </ul>
          )}
        </Row>
      </dl>

      {pending && (
        <div
          ref={actionsRef}
          className={cx(
            'duration-base flex flex-col gap-2 rounded-xl p-2 transition-colors',
            flash && 'bg-primary-soft',
          )}
        >
          <Button
            fullWidth
            onClick={() => {
              setDialog('complete');
            }}
          >
            {t.markDone}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setDialog('edit');
            }}
          >
            {t.edit}
          </Button>
          <button
            type="button"
            className="text-danger text-body min-h-11 font-semibold"
            onClick={() => {
              setDialog('cancel');
            }}
          >
            {t.cancel}
          </button>
          <p className="text-small text-text-muted">{t.typeLocked}</p>
        </div>
      )}

      {dialog === 'edit' && (
        <MilestoneFormDialog
          petId={milestone.petId}
          petName={petName}
          today={today}
          milestone={milestone}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
      {dialog === 'complete' && (
        <CompleteMilestoneDialog
          petId={milestone.petId}
          petName={petName}
          milestone={milestone}
          today={today}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
      {dialog === 'cancel' && (
        <ConfirmDialog
          open
          title={m.milestones.cancelDialog.title}
          description={m.milestones.cancelDialog.body(`${title} · ${formatDate(milestone.dueOn)}`)}
          confirmLabel={m.milestones.cancelDialog.confirm}
          cancelLabel={m.milestones.cancelDialog.keep}
          loading={cancel.isPending}
          onClose={() => {
            setDialog(null);
          }}
          onConfirm={() => {
            cancel.mutate(undefined, {
              onSuccess: () => {
                setDialog(null);
                toast.show({ kind: 'success', message: m.milestones.cancelDialog.done });
              },
              onError: (err) => {
                setDialog(null);
                const msg = toUserMessage(err);
                toast.show({
                  kind: 'error',
                  message: 'message' in msg ? msg.message : m.milestones.notPending,
                });
              },
            });
          }}
        />
      )}
    </article>
  );
}
