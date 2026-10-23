import { createFileRoute } from '@tanstack/react-router';

import { vi } from '../../../i18n/vi';

// Giữ chỗ: SCR-07 Danh sách thú cưng làm ở S2-04.
export const Route = createFileRoute('/_app/pets/')({
  staticData: { title: vi.nav.pets },
  component: () => <h1 className="text-h1">{vi.nav.pets}</h1>,
});
