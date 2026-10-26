import { createFileRoute } from '@tanstack/react-router';

import { SearchScreen } from '../../features/social';
import { m } from '../../i18n';

/** Tìm người (F-07). */
export const Route = createFileRoute('/_app/search')({
  staticData: { title: m.social.search.title },
  component: SearchScreen,
});
