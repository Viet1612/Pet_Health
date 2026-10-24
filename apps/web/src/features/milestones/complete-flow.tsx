import { ApiError } from '@ph/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { formatDate, nextDuePreview, typeLabel } from './format';
import {
  completeMilestone,
  milestonesKey,
  refreshMilestones,
  undoCompleteMilestone,
  type Milestone,
  type MilestoneGroups,
} from './queries';

const t = m.milestones.complete;

/**
 * FLW-04 (8:506): đánh dấu đã thực hiện. Cập nhật lạc quan (ẩn mốc khỏi nhóm), rồi toast
 * "Đã đánh dấu thực hiện" + [Hoàn tác] 10 s (server cho 15 s); có mốc kế tiếp thì toast thứ hai.
 */
export function useCompleteMilestone(petId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return async (milestone: Milestone, doneOn: string): Promise<void> => {
    const key = milestonesKey(petId);
    const previous = queryClient.getQueryData<MilestoneGroups>(key);
    if (previous) {
      queryClient.setQueryData<MilestoneGroups>(key, {
        ...previous,
        upcoming: previous.upcoming.filter((m) => m.id !== milestone.id),
        overdue: previous.overdue.filter((m) => m.id !== milestone.id),
      });
    }
    let result;
    try {
      result = await completeMilestone(milestone.id, doneOn);
    } catch (err) {
      if (previous) queryClient.setQueryData(key, previous);
      throw err;
    }
    await refreshMilestones(queryClient, petId, milestone.id);

    toast.show({
      kind: 'undo',
      message: t.toast,
      onUndo: () => {
        void (async () => {
          try {
            await undoCompleteMilestone(milestone.id);
            toast.show({ kind: 'success', message: t.undone });
          } catch (err) {
            const message =
              err instanceof ApiError && err.code === 'UNDO_WINDOW_EXPIRED'
                ? t.undoExpired
                : toMessage(err);
            toast.show({ kind: 'error', message });
          } finally {
            await refreshMilestones(queryClient, petId, milestone.id);
          }
        })();
      },
    });
    if (result.nextMilestone) {
      toast.show({
        kind: 'success',
        message: t.next[result.nextMilestone.type](formatDate(result.nextMilestone.dueOn)),
      });
    }
  };
}

function toMessage(err: unknown): string {
  const msg = toUserMessage(err);
  return 'message' in msg ? msg.message : m.error.serverToast;
}

/** Sheet "Đánh dấu đã thực hiện": ngày mặc định hôm nay, `max` hôm nay, xem trước mốc kế tiếp. */
export function CompleteMilestoneDialog({
  petId,
  petName,
  milestone,
  today,
  onClose,
  onDone,
}: {
  petId: string;
  petName: string;
  milestone: Milestone;
  today: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const toast = useToast();
  const complete = useCompleteMilestone(petId);
  const [doneOn, setDoneOn] = useState(today);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const preview = doneOn ? nextDuePreview(milestone.type, milestone.cycleMonths, doneOn) : null;
  const type = typeLabel(milestone.type);

  const confirm = async () => {
    if (!doneOn) {
      setError(m.milestones.form.required);
      return;
    }
    if (doneOn > today) {
      setError(t.futureDate);
      return;
    }
    setPending(true);
    try {
      await complete(milestone, doneOn);
      onClose();
      onDone?.();
    } catch (err) {
      const msg = toUserMessage(err);
      if (msg.kind === 'fields' && msg.fields.doneOn) {
        setError(msg.fields.doneOn);
      } else if (err instanceof ApiError && err.code === 'MILESTONE_NOT_PENDING') {
        toast.show({ kind: 'error', message: m.milestones.notPending });
        onClose();
      } else if (msg.kind === 'retryable') {
        toast.show({ kind: 'error', message: msg.message, onRetry: () => void confirm() });
      } else {
        toast.show({
          kind: 'error',
          message: 'message' in msg ? msg.message : m.error.serverToast,
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={t.title}>
      <p className="text-small text-text-muted mb-4">
        {t.subtitle(type, petName, formatDate(milestone.dueOn))}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
        className="flex flex-col gap-4"
      >
        <TextField
          label={t.doneOn}
          type="date"
          max={today}
          value={doneOn}
          error={error}
          hint={t.doneOnHint}
          onChange={(e) => {
            setDoneOn(e.target.value);
            setError(undefined);
          }}
        />
        {preview && (
          <Alert tone="info">
            <p className="font-semibold">{t.nextTitle}</p>
            <p>
              {milestone.type === 'VACCINE'
                ? t.nextVaccine(type, formatDate(preview))
                : t.nextCycle(milestone.cycleMonths ?? 0, type, formatDate(preview))}
            </p>
          </Alert>
        )}
        <Button type="submit" fullWidth loading={pending}>
          {t.confirm}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
