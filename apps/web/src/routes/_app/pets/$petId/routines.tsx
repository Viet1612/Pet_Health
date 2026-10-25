import { ApiError } from '@ph/api-client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';

import { petQuery } from '../../../../features/pets';
import { routinesQuery, RoutinesScreen } from '../../../../features/routines';
import { m } from '../../../../i18n';

/** SCR-16 · Việc hằng ngày. `?add=1` mở thẳng sheet Thêm việc (menu "+" của Dashboard). */
function RoutinesPage() {
  const { petId } = Route.useParams();
  const { add } = Route.useSearch();
  const navigate = useNavigate();
  const { data: pet } = useQuery(petQuery(petId));
  return (
    <>
      <h1 className="text-h1 mb-4">{m.routines.pageTitle(pet?.name ?? '')}</h1>
      <RoutinesScreen
        petId={petId}
        petName={pet?.name ?? ''}
        addOpen={add === 1}
        onAddClosed={() => void navigate({ to: '.', search: {}, replace: true } as never)}
      />
    </>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/routines')({
  validateSearch: (search: Record<string, unknown>): { add?: 1 } =>
    search.add === 1 || search.add === '1' ? { add: 1 } : {},
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(routinesQuery(params.petId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: m.routines.title },
  component: RoutinesPage,
});
