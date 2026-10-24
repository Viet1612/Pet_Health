import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';

import { useRouteTitleAndFocus } from '../app/route-meta';
import { useSessionExpiredRedirect } from '../features/session';
import { m } from '../i18n';
import { buttonClassName } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';

export interface RouterContext {
  queryClient: QueryClient;
}

function RootLayout() {
  useRouteTitleAndFocus();
  useSessionExpiredRedirect();
  return <Outlet />;
}

function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4">
      <ErrorState
        kind="not-found"
        action={
          <Link to="/" className={buttonClassName()}>
            {m.error.backHome}
          </Link>
        }
      />
    </main>
  );
}

function RootError({ error, reset }: { error: unknown; reset: () => void }) {
  const refCode =
    typeof error === 'object' && error !== null && 'ref' in error ? String(error.ref) : undefined;
  return (
    <main id="main" className="mx-auto max-w-2xl px-4">
      <ErrorState kind="server" refCode={refCode} onRetry={reset} />
    </main>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
  staticData: { title: m.appName },
});
