import { ApiError } from '@ph/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';

import { AvatarEditor, PetForm, petQuery, useUpdatePet } from '../../../../features/pets';
import { vi } from '../../../../i18n/vi';
import { useToast } from '../../../../ui/toast';

const t = vi.pets.form;

/** SCR-09 · Sửa thú cưng (12:1791). Ảnh đổi/gỡ ngay, độc lập với "Lưu thay đổi". */
function EditPetPage() {
  const { petId } = Route.useParams();
  const { avatarFailed } = Route.useSearch();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: pet } = useSuspenseQuery(petQuery(petId));
  const update = useUpdatePet(petId);

  const close = () => navigate({ to: '/pets/$petId', params: { petId } });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-h1 min-w-0 flex-1 truncate">{t.editTitle(pet.name)}</h1>
        <Link
          to="/pets/$petId"
          params={{ petId }}
          aria-label={t.close}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <X size={24} aria-hidden />
        </Link>
      </div>
      <PetForm
        mode="edit"
        initial={pet}
        avatar={<AvatarEditor pet={pet} initialFailed={avatarFailed === 1} />}
        onCancel={() => void close()}
        onSubmit={async (values) => {
          await update.mutateAsync(values);
          toast.show({ kind: 'success', message: vi.toast.saved });
          await close();
        }}
      />
    </>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/edit')({
  validateSearch: (search: Record<string, unknown>): { avatarFailed?: 1 } =>
    search.avatarFailed === 1 || search.avatarFailed === '1' ? { avatarFailed: 1 } : {},
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(petQuery(params.petId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: t.editPageTitle },
  component: EditPetPage,
});
