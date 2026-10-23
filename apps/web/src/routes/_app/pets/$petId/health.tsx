import { ApiError } from '@ph/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router';

import { petQuery } from '../../../../features/pets';
import { vi } from '../../../../i18n/vi';
import { cx } from '../../../../ui/cx';

const t = vi.health;

/** Màn Sức khỏe: segmented "Cân nặng | Sổ y tế" (Sổ y tế làm ở S3-05). */
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
          <span aria-disabled="true" className={cx(tab, 'text-text-muted gap-1')}>
            {t.tabs.visits}
            <span className="text-caption">({t.tabs.soon})</span>
          </span>
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
