import { createFileRoute, Link } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';

import { m } from '../../i18n';
import { buttonClassName } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

// Giữ chỗ: Dashboard SCR-06 làm ở S5-04.
function Home() {
  return (
    <>
      <h1 className="sr-only">{m.nav.home}</h1>
      <EmptyState
        icon={<PawPrint size={32} />}
        title={m.empty.firstPetTitle}
        description={m.empty.firstPetDescription}
        action={
          <Link to="/pets" className={buttonClassName()}>
            {m.empty.firstPetAction}
          </Link>
        }
      />
    </>
  );
}

export const Route = createFileRoute('/_app/')({
  staticData: { title: m.nav.home },
  component: Home,
});
