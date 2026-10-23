import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/pets/:petId/health` → tab mặc định Cân nặng. */
export const Route = createFileRoute('/_app/pets/$petId/health/')({
  beforeLoad: ({ params }) => {
    redirect({ to: '/pets/$petId/health/weight', params, throw: true });
  },
});
