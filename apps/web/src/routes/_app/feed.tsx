import { createFileRoute } from '@tanstack/react-router';

import { FeedScreen, myProfileQuery } from '../../features/social';
import { m } from '../../i18n';

/** Bản tin (Phase 2). */
export const Route = createFileRoute('/_app/feed')({
  loader: ({ context }) => context.queryClient.query(myProfileQuery),
  staticData: { title: m.social.feedTitle },
  component: FeedScreen,
});
