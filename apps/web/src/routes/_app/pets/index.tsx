import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PawPrint, Plus } from 'lucide-react';

import { PET_LIMIT, PetCard, petsQuery } from '../../../features/pets';
import { m } from '../../../i18n';
import { buttonClassName } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { Skeleton } from '../../../ui/Skeleton';

const t = m.pets;

/** SCR-07 · Danh sách thú cưng (12:1553). */
function PetsPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const full = pets.length >= PET_LIMIT;

  if (pets.length === 0) {
    return (
      <>
        <h1 className="text-h1 md:sr-only">{t.title}</h1>
        <EmptyState
          icon={<PawPrint size={32} />}
          title={m.empty.firstPetTitle}
          description={m.empty.firstPetDescription}
          action={
            <Link to="/pets/new" className={buttonClassName()}>
              {t.add}
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <h1 className="text-h1 mb-4 md:sr-only">{t.title}</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-text-muted">{t.count(pets.length)}</p>
        <div className="flex flex-col items-end gap-1">
          {full ? (
            <>
              <button
                type="button"
                disabled
                aria-describedby="pets-limit"
                className={buttonClassName()}
              >
                <Plus size={20} aria-hidden />
                {t.add.replace('+ ', '')}
              </button>
              <p id="pets-limit" className="text-small text-text-muted">
                {t.limitReached}
              </p>
            </>
          ) : (
            <Link to="/pets/new" className={buttonClassName()}>
              <Plus size={20} aria-hidden />
              {t.add.replace('+ ', '')}
            </Link>
          )}
        </div>
      </div>
      <ul className={cx('grid gap-3 md:grid-cols-2 xl:grid-cols-3')}>
        {pets.map((pet) => (
          <li key={pet.id}>
            <PetCard pet={pet} />
          </li>
        ))}
      </ul>
    </>
  );
}

function PetsPending() {
  return (
    <div aria-busy="true" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton shape="list-item" className="h-20" />
      <Skeleton shape="list-item" className="h-20" />
      <Skeleton shape="list-item" className="h-20" />
    </div>
  );
}

export const Route = createFileRoute('/_app/pets/')({
  loader: ({ context }) => context.queryClient.query(petsQuery),
  staticData: { title: t.title },
  pendingComponent: PetsPending,
  component: PetsPage,
});
