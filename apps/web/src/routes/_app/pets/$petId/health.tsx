import { ApiError } from '@ph/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router';

import { petQuery } from '../../../../features/pets';
import { m } from '../../../../i18n';
import { cx } from '../../../../ui/cx';

const t = m.health;

/** Màn Sức khỏe: segmented "Cân nặng | Sổ y tế". */
function HealthLayout() {
  const { petId } = Route.useParams();
  const { data: pet } = useSuspenseQuery(petQuery(petId));
  const tab =
    'text-body flex min-h-10 flex-1 items-center justify-center rounded-sm px-3 font-semibold';

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">
          {t.title}
          <span className="text-text-muted text-h2 ml-2 font-normal">· {pet.name}</span>
        </h1>
        <nav
          aria-label={t.title}
          className="border-border flex w-full rounded-md border p-1 md:w-80"
        >
          <Link
            to="/pets/$petId/health/weight"
            params={{ petId }}
            className={tab}
            activeProps={{
              className: cx(tab, 'bg-primary text-on-primary'),
              'aria-current': 'page',
            }}
          >
            {t.tabs.weight}
          </Link>
          <Link
            to="/pets/$petId/health/visits"
            params={{ petId }}
            className={tab}
            activeProps={{
              className: cx(tab, 'bg-primary text-on-primary'),
              'aria-current': 'page',
            }}
          >
            {t.tabs.visits}
          </Link>
        </nav>
      </div>
      <Outlet />
    </>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/health')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(petQuery(params.petId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: t.title },
  component: HealthLayout,
});
