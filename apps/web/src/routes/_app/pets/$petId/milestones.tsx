import { createFileRoute } from '@tanstack/react-router';

import { vi } from '../../../../i18n/vi';

// Giữ chỗ: SCR-14 Lịch mốc y tế làm ở S4-04.
export const Route = createFileRoute('/_app/pets/$petId/milestones')({
  staticData: { title: vi.nav.calendar },
  component: () => <h1 className="text-h1">{vi.nav.calendar}</h1>,
});
