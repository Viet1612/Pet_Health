import { ApiError } from '@ph/api-client';
import { useNavigate } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { getSelectedPetId, setSelectedPetId } from '../../lib/selected-pet';
import { vi } from '../../i18n/vi';
import { Button } from '../../ui/Button';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { matchesConfirmName } from './format';
import { useDeletePet, type Pet } from './queries';

const t = vi.pets.deleteDialog;

/**
 * CMP-14 TypeToConfirmDialog cho SCR-08 (12:1851): nhập lại đúng tên mới bật "Xóa vĩnh viễn".
 * API vẫn kiểm lại tên (422 CONFIRM_NAME_MISMATCH).
 */
export function DeletePetDialog({
  pet,
  open,
  onClose,
}: {
  pet: Pet;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const remove = useDeletePet(pet.id);
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const ok = matchesConfirmName(value, pet.name);

  const close = () => {
    setValue('');
    setError(undefined);
    onClose();
  };

  const leave = async () => {
    // Thay mục lịch sử `?dialog=delete-pet` để Back không mở lại hồ sơ đã xóa.
    await navigate({ to: '/pets', replace: true });
  };

  const submit = async () => {
    if (!ok) return;
    try {
      await remove.mutateAsync(value);
      if (getSelectedPetId() === pet.id) setSelectedPetId(null);
      await leave();
      toast.show({ kind: 'success', message: t.deleted(pet.name) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        await leave();
        return;
      }
      const message = toUserMessage(err);
      if (message.kind === 'fields' || (err instanceof ApiError && err.status === 422)) {
        setError(t.mismatch);
        inputRef.current?.focus();
        return;
      }
      if (message.kind === 'retryable') {
        toast.show({ kind: 'error', message: message.message, onRetry: () => void submit() });
        return;
      }
      toast.show({
        kind: 'error',
        message: 'message' in message ? message.message : vi.error.serverToast,
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onClose={close} title={t.title(pet.name)}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="bg-danger-bg text-danger flex size-12 shrink-0 items-center justify-center rounded-full"
          >
            <TriangleAlert size={24} />
          </span>
          <p className="text-body">{t.body(pet.name)}</p>
        </div>
        <div id={labelId}>
          <TextField
            ref={inputRef}
            label={t.confirmLabel(pet.name)}
            hint={t.confirmHint}
            // showModal() focus vào phần tử có autofocus.
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={value}
            error={error}
            onChange={(e) => {
              setValue(e.target.value);
              setError(undefined);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            variant="danger"
            fullWidth
            disabled={!ok}
            loading={remove.isPending}
            aria-describedby={labelId}
          >
            {t.submit}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={remove.isPending}
            onClick={close}
            className="border-primary text-primary"
          >
            {t.cancel}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
