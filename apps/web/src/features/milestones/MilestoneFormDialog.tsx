import { ApiError } from '@ph/api-client';
import { Lock } from 'lucide-react';
import { useId, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { useIdempotencyKey } from '../../api/use-idempotency-key';
import { m } from '../../i18n';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { MilestoneTypeIcon } from './components';
import { typeLabel } from './format';
import {
  useCreateMilestone,
  useUpdateMilestone,
  type Milestone,
  type MilestoneType,
} from './queries';

const t = m.milestones.form;
const TYPES: MilestoneType[] = ['VACCINE', 'FLEA', 'DEWORM'];
const CYCLE_CHIPS = [1, 3, 6];
const NOTE_MAX = 500;
const codePoints = (s: string) => Array.from(s.normalize('NFC')).length;

type Errors = Partial<Record<'type' | 'dueOn' | 'note' | 'cycleMonths', string>>;

/**
 * Tạo mốc (11:1299) / Sửa mốc (23:2983). Ngày hạn cho phép quá khứ (cảnh báo vàng, không chặn).
 * Chu kỳ chỉ với Nhỏ gáy/Tẩy giun: chip 1/3/6 tháng hoặc "Khác…" 1–60. Sửa: loại khóa, chỉ gửi
 * trường đã đổi. Trang gọi chỉ render khi mở (mỗi lần mở là một Idempotency-Key mới).
 */
export function MilestoneFormDialog({
  petId,
  petName,
  today,
  milestone,
  onClose,
}: {
  petId: string;
  petName: string;
  today: string;
  /** Có thì là dạng sửa. */
  milestone?: Milestone;
  onClose: () => void;
}) {
  const toast = useToast();
  const idPrefix = useId();
  const idempotency = useIdempotencyKey();
  const create = useCreateMilestone(petId);
  const update = useUpdateMilestone(petId, milestone?.id ?? '');
  const [type, setType] = useState<MilestoneType | null>(milestone?.type ?? null);
  const [dueOn, setDueOn] = useState(milestone?.dueOn ?? '');
  const [note, setNote] = useState(milestone?.note ?? '');
  const initialCycle = milestone?.cycleMonths ?? null;
  const [cycle, setCycle] = useState<number | null>(initialCycle);
  const [otherCycle, setOtherCycle] = useState(
    initialCycle && !CYCLE_CHIPS.includes(initialCycle) ? String(initialCycle) : '',
  );
  const [showOther, setShowOther] = useState(Boolean(otherCycle));
  const [errors, setErrors] = useState<Errors>({});
  const pending = create.isPending || update.isPending;
  const editing = Boolean(milestone);

  const cycleValue = (): { ok: true; value: number | null } | { ok: false } => {
    if (type === 'VACCINE') return { ok: true, value: null };
    if (!showOther) return { ok: true, value: cycle };
    if (otherCycle.trim() === '') return { ok: true, value: null };
    const n = Number(otherCycle);
    return Number.isInteger(n) && n >= 1 && n <= 60 ? { ok: true, value: n } : { ok: false };
  };

  const save = async () => {
    const next: Errors = {};
    if (!type) next.type = t.required;
    if (!dueOn) next.dueOn = t.required;
    if (codePoints(note.trim()) > NOTE_MAX) next.note = t.noteHint;
    const c = cycleValue();
    if (!c.ok) next.cycleMonths = t.cycleError;
    setErrors(next);
    if (Object.keys(next).length || !type || !c.ok) return;
    const noteValue = note.trim() === '' ? null : note.trim();

    try {
      if (milestone) {
        const patch = {
          ...(dueOn !== milestone.dueOn ? { dueOn } : {}),
          ...(noteValue !== milestone.note ? { note: noteValue } : {}),
          ...(c.value !== milestone.cycleMonths ? { cycleMonths: c.value } : {}),
        };
        if (Object.keys(patch).length) await update.mutateAsync(patch);
      } else {
        await create.mutateAsync({
          input: { type, dueOn, note: noteValue, cycleMonths: c.value },
          key: idempotency.key,
        });
        idempotency.reset();
      }
      toast.show({ kind: 'success', message: m.toast.saved });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MILESTONE_NOT_PENDING') {
        toast.show({ kind: 'error', message: m.milestones.notPending });
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

  const chip = (selected: boolean) =>
    cx(
      'text-small min-h-11 rounded-full border px-4 font-semibold',
      selected ? 'bg-primary text-on-primary border-primary' : 'border-border hover:bg-surface-2',
    );

  return (
    <ResponsiveDialog open onClose={onClose} title={editing ? t.editTitle : t.createTitle}>
      <p className="text-small text-text-muted mb-4">
        {milestone ? t.editSubtitle(typeLabel(milestone.type)) : petName}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        {milestone ? (
          <p className="bg-surface-2 text-body flex min-h-12 items-center gap-2 rounded-md px-3">
            <Lock size={16} aria-hidden />
            {t.typeLocked(typeLabel(milestone.type))}
          </p>
        ) : (
          <fieldset aria-describedby={errors.type ? `${idPrefix}-type-error` : undefined}>
            <legend className="text-small mb-2 font-semibold">{t.type}</legend>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
              {TYPES.map((ty) => (
                <label
                  key={ty}
                  className={cx(
                    'has-focus-visible:outline-focus flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-2 text-center has-focus-visible:outline-2',
                    type === ty ? 'border-primary bg-primary-soft' : 'border-divider',
                  )}
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-type`}
                    className="sr-only"
                    checked={type === ty}
                    onChange={() => {
                      setType(ty);
                      setErrors((e) => ({ ...e, type: undefined }));
                    }}
                  />
                  <MilestoneTypeIcon type={ty} />
                  <span className="text-small font-semibold">{typeLabel(ty)}</span>
                </label>
              ))}
            </div>
            {errors.type && (
              <p id={`${idPrefix}-type-error`} className="text-small text-danger mt-1">
                {errors.type}
              </p>
            )}
          </fieldset>
        )}

        <TextField
          label={t.dueOn}
          type="date"
          value={dueOn}
          error={errors.dueOn}
          {...(editing ? { hint: t.dueOnEditHint } : {})}
          onChange={(e) => {
            setDueOn(e.target.value);
            setErrors((er) => ({ ...er, dueOn: undefined }));
          }}
        />
        {dueOn && dueOn < today && <Alert tone="warning">{t.pastWarning}</Alert>}

        <div className="flex flex-col gap-1">
          <TextField
            label={t.note}
            value={note}
            error={errors.note}
            hint={t.noteHint}
            maxLength={NOTE_MAX + 50}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
          {NOTE_MAX - codePoints(note) <= 50 && (
            <span aria-live="polite" className="text-small text-text-muted self-end">
              {String(codePoints(note))} / {String(NOTE_MAX)}
            </span>
          )}
        </div>

        {type === 'VACCINE' ? (
          <p className="text-small text-text-muted">{t.vaccineCycle}</p>
        ) : type ? (
          <fieldset>
            <legend className="text-small mb-2 font-semibold">{t.cycle}</legend>
            <div className="flex flex-wrap gap-2">
              {CYCLE_CHIPS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={!showOther && cycle === n}
                  className={chip(!showOther && cycle === n)}
                  onClick={() => {
                    setShowOther(false);
                    setCycle(cycle === n && !showOther ? null : n);
                    setErrors((e) => ({ ...e, cycleMonths: undefined }));
                  }}
                >
                  {t.cycleMonths(n)}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={showOther}
                className={chip(showOther)}
                onClick={() => {
                  setShowOther(!showOther);
                  setErrors((e) => ({ ...e, cycleMonths: undefined }));
                }}
              >
                {t.cycleOther}
              </button>
            </div>
            {showOther && (
              <TextField
                label={t.cycle}
                className="mt-2"
                inputMode="numeric"
                value={otherCycle}
                error={errors.cycleMonths}
                onChange={(e) => {
                  setOtherCycle(e.target.value);
                  setErrors((er) => ({ ...er, cycleMonths: undefined }));
                }}
              />
            )}
            {!showOther && errors.cycleMonths && (
              <p className="text-small text-danger mt-1">{errors.cycleMonths}</p>
            )}
            <p className="text-small text-text-muted mt-1">{t.cycleHint}</p>
          </fieldset>
        ) : null}

        <Button type="submit" fullWidth loading={pending}>
          {editing ? t.saveChanges : t.save}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
