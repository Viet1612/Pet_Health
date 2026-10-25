import { useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { useIdempotencyKey } from '../../api/use-idempotency-key';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { formatKg, parseKgInput } from './format';
import { useAddWeight, useUpdateWeight, type WeightEntry } from './queries';
import { track } from '../../api/analytics';

const t = m.weights.entry;

/**
 * Sheet Thêm/Sửa cân nặng (10:719). Trang gọi chỉ render khi mở, nên mỗi lần mở là trạng thái mới
 * và một `Idempotency-Key` mới (giữ nguyên khi "Thử lại").
 */
export function WeightEntryDialog({
  petId,
  petName,
  target,
  today,
  entry,
  onClose,
}: {
  petId: string;
  petName: string;
  target: string | null;
  /** Hôm nay theo múi giờ tài khoản: mặc định và `max` của ô ngày. */
  today: string;
  /** Có thì là dạng sửa. */
  entry?: WeightEntry;
  onClose: () => void;
}) {
  const toast = useToast();
  const add = useAddWeight(petId);
  const update = useUpdateWeight(petId);
  const idempotency = useIdempotencyKey();
  const [kg, setKg] = useState(entry ? entry.weightKg.replace('.', ',') : '');
  const [date, setDate] = useState(entry?.measuredOn ?? today);
  const [errors, setErrors] = useState<{ weightKg?: string; measuredOn?: string }>({});
  const pending = add.isPending || update.isPending;

  const save = async () => {
    const parsed = parseKgInput(kg);
    const next: typeof errors = {};
    if (!parsed.ok) next.weightKg = parsed.error;
    if (date > today) next.measuredOn = m.weights.errors.futureDate;
    setErrors(next);
    if (!parsed.ok || next.measuredOn) return;

    try {
      if (entry) {
        await update.mutateAsync({ id: entry.id, weightKg: parsed.value, measuredOn: date });
      } else {
        await add.mutateAsync({ weightKg: parsed.value, measuredOn: date, key: idempotency.key });
        idempotency.reset();
        track('weight_logged', {
          has_target: target !== null,
          days_since_last_log: null,
          entry_point: window.location.pathname === '/' ? 'dashboard' : 'weight_page',
        });
      }
      toast.show({ kind: 'success', message: m.toast.saved });
      onClose();
    } catch (err) {
      const message = toUserMessage(err);
      if (message.kind === 'fields') {
        setErrors({
          ...(message.fields.weightKg ? { weightKg: message.fields.weightKg } : {}),
          ...(message.fields.measuredOn ? { measuredOn: message.fields.measuredOn } : {}),
        });
        return;
      }
      if (message.kind === 'retryable') {
        toast.show({ kind: 'error', message: message.message, onRetry: () => void save() });
        return;
      }
      toast.show({
        kind: 'error',
        message: 'message' in message ? message.message : m.error.serverToast,
      });
    }
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={entry ? t.editTitle : t.addTitle}>
      <p className="text-small text-text-muted mb-4">
        {t.subtitle(petName, target ? formatKg(target) : null)}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        <TextField
          label={t.weight}
          inputMode="decimal"
          autoComplete="off"
          // Mở sheet là nhập ngay (≤ 3 lần chạm từ Dashboard).
          autoFocus
          value={kg}
          error={errors.weightKg}
          hint={t.weightHint}
          trailing={<span className="text-body text-text-muted pr-3">kg</span>}
          onChange={(e) => {
            setKg(e.target.value);
          }}
        />
        <TextField
          label={t.date}
          type="date"
          max={today}
          value={date}
          error={errors.measuredOn}
          hint={t.dateHint}
          onChange={(e) => {
            setDate(e.target.value || today);
          }}
        />
        <Button type="submit" fullWidth loading={pending}>
          {t.save}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
