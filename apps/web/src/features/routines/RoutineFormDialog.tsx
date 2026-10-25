import { ApiError } from '@ph/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { useIdempotencyKey } from '../../api/use-idempotency-key';
import { m } from '../../i18n';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import {
  refreshRoutines,
  useCreateRoutine,
  useDeleteRoutine,
  useUpdateRoutine,
  type Routine,
} from './queries';

const t = m.routines.form;
const NAME_MAX = 100;
const codePoints = (s: string) => Array.from(s.normalize('NFC')).length;

type Errors = Partial<Record<'name' | 'timeOfDay', string>>;

/** Hộp xác nhận xóa việc (CMP-13); dùng ở menu "⋮" và trong sheet Sửa. */
export function DeleteRoutineDialog({
  petId,
  routine,
  onClose,
  onDeleted,
}: {
  petId: string;
  routine: Routine;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const remove = useDeleteRoutine(petId, routine.id);
  return (
    <ConfirmDialog
      open
      title={m.routines.deleteDialog.title(routine.name)}
      description={m.routines.deleteDialog.body}
      confirmLabel={m.routines.deleteDialog.confirm}
      loading={remove.isPending}
      onClose={onClose}
      onConfirm={() => {
        remove.mutate(undefined, {
          onSuccess: () => {
            toast.show({ kind: 'success', message: m.routines.deleteDialog.done });
            onClose();
            onDeleted?.();
          },
          onError: (err) => {
            const msg = toUserMessage(err);
            toast.show({
              kind: 'error',
              message: 'message' in msg ? msg.message : m.error.serverToast,
            });
            onClose();
          },
        });
      }}
    />
  );
}

/**
 * Sheet Thêm việc (11:1615) / Sửa việc (23:3144). Trang gọi chỉ render khi mở (mỗi lần mở là một
 * Idempotency-Key mới; "Thử lại" dùng lại key). Sửa chỉ gửi trường đã đổi.
 */
export function RoutineFormDialog({
  petId,
  petName,
  routine,
  onClose,
}: {
  petId: string;
  petName: string;
  /** Có thì là dạng sửa. */
  routine?: Routine;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const idempotency = useIdempotencyKey();
  const create = useCreateRoutine(petId);
  const update = useUpdateRoutine(petId, routine?.id ?? '');
  const [name, setName] = useState(routine?.name ?? '');
  const [timeOfDay, setTimeOfDay] = useState(routine?.timeOfDay ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = create.isPending || update.isPending;
  const unchanged = routine
    ? name.trim() === routine.name && timeOfDay === routine.timeOfDay
    : false;

  const save = async () => {
    const trimmed = name.trim();
    const next: Errors = {};
    if (trimmed === '') next.name = t.nameRequired;
    else if (codePoints(trimmed) > NAME_MAX) next.name = t.nameTooLong;
    if (timeOfDay === '') next.timeOfDay = t.required;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    try {
      if (routine) {
        await update.mutateAsync({
          ...(trimmed !== routine.name ? { name: trimmed } : {}),
          ...(timeOfDay !== routine.timeOfDay ? { timeOfDay } : {}),
        });
      } else {
        await create.mutateAsync({ input: { name: trimmed, timeOfDay }, key: idempotency.key });
        idempotency.reset();
      }
      toast.show({ kind: 'success', message: m.toast.saved });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ROUTINE_LIMIT_REACHED') {
        setFormError(m.routines.limitReached);
        void refreshRoutines(queryClient, petId);
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        toast.show({ kind: 'error', message: m.routines.gone });
        void refreshRoutines(queryClient, petId);
        onClose();
        return;
      }
      const msg = toUserMessage(err);
      if (msg.kind === 'fields') {
        setErrors(msg.fields);
      } else if (msg.kind === 'retryable') {
        toast.show({ kind: 'error', message: msg.message, onRetry: () => void save() });
      } else {
        toast.show({ kind: 'error', message: msg.message });
      }
    }
  };

  if (confirmDelete && routine) {
    return (
      <DeleteRoutineDialog
        petId={petId}
        routine={routine}
        onClose={() => {
          setConfirmDelete(false);
        }}
        onDeleted={onClose}
      />
    );
  }

  return (
    <ResponsiveDialog open onClose={onClose} title={routine ? t.editTitle : t.addTitle}>
      <p className="text-small text-text-muted mb-4">
        {routine ? t.editSubtitle : t.addSubtitle(petName)}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        {formError && <Alert tone="danger">{formError}</Alert>}
        <TextField
          label={t.name}
          value={name}
          hint={t.nameHint}
          error={errors.name}
          maxLength={NAME_MAX}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setErrors((er) => ({ ...er, name: undefined }));
          }}
        />
        <TextField
          label={t.time}
          type="time"
          step={60}
          value={timeOfDay}
          hint={t.timeHint}
          error={errors.timeOfDay}
          onChange={(e) => {
            setTimeOfDay(e.target.value.slice(0, 5));
            setErrors((er) => ({ ...er, timeOfDay: undefined }));
          }}
        />
        <Button type="submit" fullWidth loading={pending} disabled={unchanged}>
          {routine ? t.saveChanges : t.save}
        </Button>
        {routine && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="text-body text-danger min-h-11 self-start font-semibold"
              onClick={() => {
                setConfirmDelete(true);
              }}
            >
              {t.delete}
            </button>
            <p className="text-small text-text-muted">{t.deleteNote}</p>
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
