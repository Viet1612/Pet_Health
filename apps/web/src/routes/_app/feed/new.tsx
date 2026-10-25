import { createFileRoute } from '@tanstack/react-router';

import { ComposerScreen } from '../../../features/social';
import { m } from '../../../i18n';

/** Soạn bài mới (F-05). */
export const Route = createFileRoute('/_app/feed/new')({
  staticData: { title: m.social.composer.title },
  component: ComposerScreen,
});
