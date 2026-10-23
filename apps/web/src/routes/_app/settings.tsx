import { createFileRoute } from '@tanstack/react-router';

import { vi } from '../../i18n/vi';

// Giữ chỗ: SCR-18 Cài đặt tài khoản làm ở S6-02.
export const Route = createFileRoute('/_app/settings')({
  staticData: { title: vi.nav.settings },
  component: () => <h1 className="text-h1">{vi.nav.settings}</h1>,
});
