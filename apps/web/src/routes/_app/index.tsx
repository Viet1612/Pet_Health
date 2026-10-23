import { createFileRoute, Link } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';

import { vi } from '../../i18n/vi';
import { buttonClassName } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

// Giữ chỗ: Dashboard SCR-06 làm ở S5-04.
function Home() {
  return (
    <>
      <h1 className="sr-only">{vi.nav.home}</h1>
      <EmptyState
        icon={<PawPrint size={32} />}
        title={vi.empty.firstPetTitle}
        description={vi.empty.firstPetDescription}
        action={
          <Link to="/pets" className={buttonClassName()}>
            {vi.empty.firstPetAction}
          </Link>
        }
      />
    </>
  );
}

export const Route = createFileRoute('/_app/')({
  staticData: { title: vi.nav.home },
  component: Home,
});
