import { ApiError } from '@ph/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  ListChecks,
  NotebookPen,
  Scale,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import {
  DeletePetDialog,
  formatLocalDate,
  PetAvatar,
  petQuery,
  petSubline,
  useSelectedPet,
  type Pet,
} from '../../../../features/pets';
import { m } from '../../../../i18n';
import { cx } from '../../../../ui/cx';
import { Skeleton } from '../../../../ui/Skeleton';
import { useDialogParam } from '../../../../ui/use-dialog-param';

const t = m.pets;

function Shortcut({ icon, label, to }: { icon: ReactNode; label: string; to?: string }) {
  const body = (
    <>
      <span
        aria-hidden
        className="bg-primary-soft text-primary-soft-fg flex size-10 items-center justify-center rounded-lg"
      >
        {icon}
      </span>
      <span className="text-body flex-1 font-semibold">{label}</span>
      {to ? (
        <ChevronRight size={18} aria-hidden className="text-text-muted" />
      ) : (
        <span className="text-caption text-text-muted">{t.shortcuts.soon}</span>
      )}
    </>
  );
  const className =
    'bg-surface border-divider flex min-h-16 items-center gap-3 rounded-lg border p-3';
  return to ? (
    <Link to={to as never} className={cx(className, 'hover:bg-surface-2')}>
      {body}
    </Link>
  ) : (
    <div className={cx(className, 'opacity-70')}>{body}</div>
  );
}

function DeleteLink({ pet, onOpen }: { pet: Pet; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onOpen}
        className="text-danger text-body min-h-11 self-start font-semibold"
      >
        {t.deleteLink}
      </button>
      <p className="text-small text-text-muted">{t.deleteHint(pet.name)}</p>
    </div>
  );
}

/** SCR-08 · Hồ sơ thú cưng (12:1635). */
function PetProfilePage() {
  const { petId } = Route.useParams();
  const { data: pet } = useSuspenseQuery(petQuery(petId));
  const { select } = useSelectedPet();
  const deleteDialog = useDialogParam('delete-pet');

  // Mở hồ sơ của con nào thì con đó thành thú cưng đang chọn.
  useEffect(() => {
    select(pet.id);
  }, [pet.id, select]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/pets"
          aria-label={t.back}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft size={24} aria-hidden />
        </Link>
        <h1 className="text-h2 flex-1">{t.profileTitle}</h1>
        <Link
          to="/pets/$petId/edit"
          params={{ petId }}
          className="text-primary text-body min-h-11 content-center px-2 font-semibold"
        >
          {t.edit}
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
        <section className="bg-surface border-divider flex flex-col items-center gap-2 rounded-xl border p-6 text-center md:items-start md:text-left">
          <PetAvatar pet={pet} size={96} className="md:hidden" />
          <PetAvatar pet={pet} size={112} className="hidden md:inline-flex" />
          <h2 className="text-h1 mt-2 break-words">{pet.name}</h2>
          <p className="text-body text-text-muted">{petSubline(pet)}</p>
          <p className="text-small text-text-muted">{t.born(formatLocalDate(pet.birthDate))}</p>
          <div className="mt-6 hidden w-full md:block">
            <DeleteLink pet={pet} onOpen={deleteDialog.show} />
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {pet.description && (
            <section className="bg-surface border-divider rounded-xl border p-4">
              <h3 className="text-caption text-text-muted mb-2 uppercase">{t.identification}</h3>
              <p className="text-body break-words whitespace-pre-line">{pet.description}</p>
            </section>
          )}
          <nav aria-label={t.profileTitle} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Shortcut
              icon={<Scale size={22} />}
              label={t.shortcuts.weight}
              to={`/pets/${petId}/health/weight`}
            />
            <Shortcut
              icon={<NotebookPen size={22} />}
              label={t.shortcuts.visits}
              to={`/pets/${petId}/health/visits`}
            />
            <Shortcut
              icon={<CalendarClock size={22} />}
              label={t.shortcuts.milestones}
              to={`/pets/${petId}/milestones`}
            />
            <Shortcut
              icon={<ListChecks size={22} />}
              label={t.shortcuts.routines}
              to={`/pets/${petId}/routines`}
            />
          </nav>
          <div className="md:hidden">
            <DeleteLink pet={pet} onOpen={deleteDialog.show} />
          </div>
        </div>
      </div>
      <DeletePetDialog pet={pet} open={deleteDialog.open} onClose={deleteDialog.close} />
    </>
  );
}

function ProfilePending() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-11 w-48" />
      <Skeleton shape="card" className="h-64" />
      <Skeleton shape="card" />
    </div>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(petQuery(params.petId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: t.profileTitle },
  pendingComponent: ProfilePending,
  component: PetProfilePage,
});
