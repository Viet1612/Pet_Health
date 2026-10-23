import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@ph/api-client';
import { AlertCircle } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { toUserMessage } from '../../api/to-user-message';
import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { deviceToday } from './format';
import type { Pet, PetSex, PetValues } from './queries';

const t = vi.pets.form;
const codePoints = (s: string): number => Array.from(s).length;
const DESCRIPTION_MAX = 2000;

const zName = z
  .string()
  .trim()
  .min(1, { error: t.required })
  .refine((s) => codePoints(s) <= 50, { error: t.tooLong });

const petFormSchema = z.object({
  name: zName,
  breed: zName,
  sex: z.string().refine((s) => s === 'MALE' || s === 'FEMALE', { error: t.required }),
  birthDate: z
    .string()
    .min(1, { error: t.required })
    .refine((d) => d <= deviceToday(), { error: t.futureDate }),
  description: z
    .string()
    .refine((s) => codePoints(s.trim()) <= DESCRIPTION_MAX, { error: t.descriptionTooLong }),
});
type PetFormInput = z.input<typeof petFormSchema>;
type PetFormValues = z.output<typeof petFormSchema>;
const FIELDS = ['name', 'breed', 'sex', 'birthDate', 'description'] as const;

function SexSegmented({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (sex: PetSex) => void;
  error: string | undefined;
}) {
  const id = useId();
  const options: { value: PetSex; label: string }[] = [
    { value: 'MALE', label: vi.pets.male },
    { value: 'FEMALE', label: vi.pets.female },
  ];
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-small mb-1 font-semibold">{t.sex} *</legend>
      <div
        className={cx(
          'flex rounded-md border p-1',
          error ? 'border-danger border-2' : 'border-border',
        )}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'text-body flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-sm font-semibold',
              'has-focus-visible:outline-focus has-focus-visible:outline-2',
              value === o.value ? 'bg-primary text-on-primary' : 'text-text hover:bg-surface-2',
            )}
          >
            <input
              type="radio"
              name={`${id}-sex`}
              value={o.value}
              checked={value === o.value}
              aria-invalid={error ? true : undefined}
              onChange={() => {
                onChange(o.value);
              }}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-small text-danger flex items-center gap-1">
          <AlertCircle size={16} aria-hidden />
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * SCR-09 Thêm/Sửa (12:1728, 12:1791). Lỗi client hiện ngay dưới trường; lỗi `422` của server gán
 * vào đúng trường; lỗi mạng → toast "Thử lại" (giữ nguyên Idempotency-Key ở trang gọi).
 */
export function PetForm({
  mode,
  initial,
  avatar,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial?: Pet;
  /** Ô ảnh đại diện (AvatarPicker khi tạo, AvatarEditor khi sửa). */
  avatar: ReactNode;
  onSubmit: (values: PetValues) => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const form = useForm<PetFormInput, unknown, PetFormValues>({
    resolver: zodResolver(petFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      name: initial?.name ?? '',
      breed: initial?.breed ?? '',
      sex: initial?.sex ?? '',
      birthDate: initial?.birthDate ?? '',
      description: initial?.description ?? '',
    },
  });
  const sex = useWatch({ control: form.control, name: 'sex' });
  const description = useWatch({ control: form.control, name: 'description' });
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit({
        name: v.name,
        breed: v.breed,
        sex: v.sex,
        birthDate: v.birthDate,
        description: v.description.trim() === '' ? null : v.description.trim(),
      });
    } catch (err) {
      const message = toUserMessage(err);
      if (message.kind === 'fields') {
        let first = true;
        for (const field of FIELDS) {
          const text = message.fields[field];
          if (!text) continue;
          form.setError(field, { message: text }, { shouldFocus: first });
          first = false;
        }
        if (!first) return;
      }
      if (message.kind === 'retryable') {
        toast.show({ kind: 'error', message: message.message, onRetry: () => void submit() });
        return;
      }
      const text =
        err instanceof ApiError && err.code === 'PET_LIMIT_REACHED'
          ? vi.pets.limitReached
          : 'message' in message
            ? message.message
            : vi.error.serverToast;
      toast.show({ kind: 'error', message: text });
    }
  });

  return (
    <form
      noValidate
      onSubmit={(e) => void submit(e)}
      className="grid gap-6 md:grid-cols-[220px_1fr] md:items-start"
    >
      <div className="md:bg-surface md:border-divider md:rounded-xl md:border md:p-6">{avatar}</div>

      <div className="bg-surface border-divider flex flex-col gap-4 md:rounded-xl md:border md:p-6">
        <TextField
          label={`${t.name} *`}
          hint={t.nameHint}
          autoComplete="off"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={`${t.breed} *`}
            autoComplete="off"
            error={errors.breed?.message}
            {...form.register('breed')}
          />
          <SexSegmented
            value={sex}
            error={errors.sex?.message}
            onChange={(value) => {
              form.setValue('sex', value, { shouldValidate: true, shouldDirty: true });
            }}
          />
        </div>
        <TextField
          label={`${t.birthDate} *`}
          type="date"
          max={deviceToday()}
          hint={t.birthDateHint}
          error={errors.birthDate?.message}
          {...form.register('birthDate')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="pet-description" className="text-small font-semibold">
            {t.description}
          </label>
          <textarea
            id="pet-description"
            rows={4}
            placeholder={t.descriptionPlaceholder}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby="pet-description-count"
            className={cx(
              'bg-surface text-body rounded-md border px-3 py-2',
              errors.description ? 'border-danger border-2' : 'border-border',
            )}
            {...form.register('description')}
          />
          <div className="flex justify-between gap-2">
            <span className="text-small text-danger">{errors.description?.message}</span>
            <span id="pet-description-count" className="text-small text-text-muted">
              {String(codePoints(description))} / {String(DESCRIPTION_MAX)}
            </span>
          </div>
        </div>

        {/* Phone: nút dính đáy (trên BottomNav); ≥ 768 px: Hủy · Lưu căn phải. */}
        <div className="bg-surface border-divider sticky bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-4 flex gap-3 border-t px-4 py-3 md:static md:mx-0 md:justify-end md:border-0 md:p-0">
          <Button variant="secondary" className="hidden md:inline-flex" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            className="flex-1 md:flex-none"
          >
            {mode === 'create' ? t.save : t.saveChanges}
          </Button>
        </div>
      </div>
    </form>
  );
}
