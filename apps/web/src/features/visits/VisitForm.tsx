import { useRef, useState, type ReactNode } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { TextAreaCounter } from '../../ui/TextAreaCounter';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { countChars, VISIT_TEXT_MAX } from './format';
import type { VisitValues } from './queries';

const t = vi.visits.form;
const TEXT_FIELDS = ['symptoms', 'diagnosis', 'prescription'] as const;
type Field = 'visitedOn' | (typeof TEXT_FIELDS)[number];

const LABELS: Record<(typeof TEXT_FIELDS)[number], string> = {
  symptoms: vi.visits.symptoms,
  diagnosis: vi.visits.diagnosis,
  prescription: vi.visits.prescription,
};

/**
 * SCR-13 thêm/sửa (10:1206, 23:3061). Kiểm ở client như server: ngày bắt buộc, không ở tương lai;
 * mỗi trường ≤ 2.000 ký tự (code point sau NFC); cần triệu chứng hoặc chẩn đoán.
 */
export function VisitForm({
  mode,
  initial,
  today,
  photos,
  photosHeader,
  extraActions,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  mode: 'create' | 'edit';
  initial?: VisitValues;
  today: string;
  /** Ô ảnh (PhotoPicker khi tạo, PhotoUploader khi sửa). */
  photos: ReactNode;
  /** "3/5 · JPG, PNG, HEIC ≤ 5 MB" */
  photosHeader: string;
  /** Ví dụ nút "Xóa lần khám" ở dạng sửa. */
  extraActions?: ReactNode;
  onSubmit: (values: VisitValues) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState<Record<Field, string>>({
    visitedOn: initial?.visitedOn ?? today,
    symptoms: initial?.symptoms ?? '',
    diagnosis: initial?.diagnosis ?? '',
    prescription: initial?.prescription ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, setPending] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});
  const tooLong = TEXT_FIELDS.some((f) => countChars(values[f]) > VISIT_TEXT_MAX);

  const set = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    onDirtyChange?.(true);
  };

  const focusFirst = (errs: Partial<Record<Field, string>>) => {
    const first = (['visitedOn', ...TEXT_FIELDS] as Field[]).find((f) => errs[f]);
    if (first) refs.current[first]?.focus();
  };

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {};
    if (!values.visitedOn) next.visitedOn = t.required;
    else if (values.visitedOn > today) next.visitedOn = t.futureDate;
    if (!values.symptoms.trim() && !values.diagnosis.trim()) {
      next.symptoms = t.needOne;
      next.diagnosis = t.needOne;
    }
    for (const f of TEXT_FIELDS) if (countChars(values[f]) > VISIT_TEXT_MAX) next[f] = t.tooLong;
    setErrors(next);
    if (Object.keys(next).length) {
      focusFirst(next);
      return;
    }

    setPending(true);
    try {
      const text = (s: string) => (s.trim() === '' ? null : s);
      await onSubmit({
        visitedOn: values.visitedOn,
        symptoms: text(values.symptoms),
        diagnosis: text(values.diagnosis),
        prescription: text(values.prescription),
      });
    } catch (err) {
      const m = toUserMessage(err);
      if (m.kind === 'fields') {
        const fieldErrors: Partial<Record<Field, string>> = {};
        for (const f of ['visitedOn', ...TEXT_FIELDS] as Field[]) {
          if (m.fields[f]) fieldErrors[f] = m.fields[f];
        }
        setErrors(fieldErrors);
        focusFirst(fieldErrors);
      } else if (m.kind === 'retryable') {
        toast.show({ kind: 'error', message: m.message, onRetry: () => void submit() });
      } else {
        toast.show({ kind: 'error', message: m.message });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="bg-surface border-divider flex flex-col gap-4 md:rounded-xl md:border md:p-6"
    >
      <TextField
        ref={(el) => {
          refs.current.visitedOn = el;
        }}
        label={t.visitedOn}
        type="date"
        max={today}
        value={values.visitedOn}
        error={errors.visitedOn}
        hint={t.visitedOnHint}
        className="md:max-w-xs"
        onChange={(e) => {
          set('visitedOn', e.target.value);
        }}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {TEXT_FIELDS.map((f) => (
          <TextAreaCounter
            key={f}
            ref={(el) => {
              refs.current[f] = el;
            }}
            label={LABELS[f]}
            value={values[f]}
            max={VISIT_TEXT_MAX}
            error={errors[f]}
            {...(f === 'prescription' ? { placeholder: t.prescriptionPlaceholder } : {})}
            onChange={(e) => {
              set(f, e.target.value);
            }}
          />
        ))}
      </div>
      <p className="text-small text-text-muted -mt-2">{t.symptomsOrDiagnosis}</p>

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-small font-semibold">{vi.visits.photos}</h2>
          <span className="text-small text-text-muted">{photosHeader}</span>
        </div>
        {photos}
      </section>

      {extraActions}

      {/* Phone: nút dính đáy (trên BottomNav); ≥ 768 px: Hủy · Lưu căn phải. */}
      <div className="bg-surface border-divider sticky bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-4 flex gap-3 border-t px-4 py-3 md:static md:mx-0 md:justify-end md:border-0 md:p-0">
        <Button variant="secondary" className="hidden md:inline-flex" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" loading={pending} disabled={tooLong} className="flex-1 md:flex-none">
          {mode === 'create' ? t.save : t.saveChanges}
        </Button>
      </div>
    </form>
  );
}
