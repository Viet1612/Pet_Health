import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { SETTINGS_SECTIONS, SettingsScreen, type SettingsSection } from '../../features/settings';
import { m } from '../../i18n';

const t = m.settings;

/** SCR-18 · Cài đặt (`?section=` chỉ dùng ở ≥ 768 px; phone hiện mọi nhóm). */
function SettingsPage() {
  const { section } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <h1 className="text-h1">{t.title}</h1>
      <SettingsScreen
        section={section ?? 'account'}
        onSection={(s) => void navigate({ to: '/settings', search: { section: s }, replace: true })}
      />
    </div>
  );
}

export const Route = createFileRoute('/_app/settings')({
  validateSearch: (search: Record<string, unknown>): { section?: SettingsSection } =>
    SETTINGS_SECTIONS.includes(search.section as SettingsSection)
      ? { section: search.section as SettingsSection }
      : {},
  staticData: { title: t.title },
  component: SettingsPage,
});
