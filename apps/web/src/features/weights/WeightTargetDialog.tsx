import { useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { parseKgInput } from './format';
import { useSetWeightTarget } from './queries';

const t = m.weights.targetDialog;

/**
 * Sheet Cân nặng mục tiêu (10:817). Lưu ô trống khi đã có mục tiêu = xóa mục tiêu. Trang gọi chỉ
 * render khi mở.
 */
export function WeightTargetDialog({
  petId,
  petName,
  target,
  onClose,
}: {
  petId: string;
  petName: string;
  target: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const mutation = useSetWeightTarget(petId);
  const [value, setValue] = useState(target ? target.replace('.', ',') : '');
  const [error, setError] = useState<string | undefined>();
  const [confirmClear, setConfirmClear] = useState(false);

  const submit = async (weightKg: string | null, successMessage: string) => {
    try {
      await mutation.mutateAsync(weightKg);
      toast.show({ kind: 'success', message: successMessage });
      onClose();
    } catch (err) {
      const message = toUserMessage(err);
      if (message.kind === 'fields' && message.fields.weightKg) {
        setError(message.fields.weightKg);
        return;
      }
      toast.show({
        kind: 'error',
        message: 'message' in message ? message.message : m.error.serverToast,
        ...(message.kind === 'retryable'
          ? { onRetry: () => void submit(weightKg, successMessage) }
          : {}),
      });
    }
  };

  const save = () => {
    if (value.trim() === '' && target) {
      setConfirmClear(true);
      return;
    }
    const parsed = parseKgInput(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    void submit(parsed.value, m.toast.saved);
  };

  if (confirmClear) {
    return (
      <ConfirmDialog
        open
        title={t.clearConfirm}
        confirmLabel={t.clear}
        loading={mutation.isPending}
        onConfirm={() => void submit(null, t.cleared)}
        onClose={() => {
          setConfirmClear(false);
        }}
      />
    );
  }

  return (
    <ResponsiveDialog open onClose={onClose} title={t.title}>
      <p className="text-small text-text-muted mb-4">{t.subtitle(petName)}</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4"
      >
        <TextField
          label={t.field}
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={value}
          error={error}
          hint={t.hint}
          trailing={<span className="text-body text-text-muted pr-3">kg</span>}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          {t.save}
        </Button>
        {target && (
          <button
            type="button"
            className="text-danger text-body min-h-11 font-semibold"
            onClick={() => {
              setConfirmClear(true);
            }}
          >
            {t.clear}
          </button>
        )}
      </form>
    </ResponsiveDialog>
  );
}
