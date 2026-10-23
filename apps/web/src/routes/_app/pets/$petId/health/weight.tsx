import { createFileRoute } from '@tanstack/react-router';

import { vi } from '../../../../../i18n/vi';

// Giữ chỗ: SCR-10 Sức khỏe / Cân nặng làm ở S3-02.
export const Route = createFileRoute('/_app/pets/$petId/health/weight')({
  staticData: { title: vi.nav.health },
  component: () => <h1 className="text-h1">{vi.nav.health}</h1>,
});
