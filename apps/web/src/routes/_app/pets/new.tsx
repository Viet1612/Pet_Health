import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useState } from 'react';

import { useIdempotencyKey } from '../../../api/use-idempotency-key';
import {
  AvatarPicker,
  PET_LIMIT,
  PetForm,
  pendingAvatarFiles,
  petsQuery,
  uploadAvatar,
  useCreatePet,
  useSelectedPet,
} from '../../../features/pets';
import { vi } from '../../../i18n/vi';
import { useToast } from '../../../ui/toast';

const t = vi.pets.form;

/**
 * SCR-09 · Thêm thú cưng (12:1728). Lưu xong mới tải ảnh; ảnh lỗi thì thú cưng vẫn được tạo và
 * chuyển sang trang sửa với ô ảnh báo lỗi + "Thử lại".
 */
function NewPetPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreatePet();
  const { select } = useSelectedPet();
  const idempotency = useIdempotencyKey();
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-h1 flex-1">{t.addTitle}</h1>
        <Link
          to="/pets"
          aria-label={t.close}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <X size={24} aria-hidden />
        </Link>
      </div>
      <PetForm
        mode="create"
        avatar={<AvatarPicker file={file} onChange={setFile} />}
        onCancel={() => void navigate({ to: '/pets' })}
        onSubmit={async (values) => {
          const pet = await create.mutateAsync({ values, key: idempotency.key });
          idempotency.reset();
          select(pet.id);
          if (file) {
            try {
              await uploadAvatar(pet.id, file, {
                progress: () => undefined,
                processing: () => undefined,
              });
            } catch {
              pendingAvatarFiles.set(pet.id, file);
              await navigate({
                to: '/pets/$petId/edit',
                params: { petId: pet.id },
                search: { avatarFailed: 1 },
              });
              return;
            }
          }
          toast.show({ kind: 'success', message: t.added(pet.name) });
          await navigate({ to: '/' });
        }}
      />
    </>
  );
}

export const Route = createFileRoute('/_app/pets/new')({
  loader: async ({ context }) => {
    const pets = await context.queryClient.query(petsQuery);
    if (pets.length >= PET_LIMIT) redirect({ to: '/pets', throw: true });
  },
  staticData: { title: t.addTitle },
  component: NewPetPage,
});
