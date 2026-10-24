import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { locale, m } from '../../i18n';
import { consumeLocaleChanged, setLocale, SUPPORTED } from '../../i18n/locale';
import { Card } from '../../ui/Card';
import { useToast } from '../../ui/toast';

const t = m.settings;

// SCR-18 Cài đặt: S4-07 làm khung và mục Ngôn ngữ; múi giờ, mật khẩu, email, xóa tài khoản ở S6.
export const Route = createFileRoute('/_app/settings')({
  staticData: { title: t.title },
  component: SettingsScreen,
});

function SettingsScreen() {
  const toast = useToast();

  useEffect(() => {
    if (consumeLocaleChanged()) toast.show({ kind: 'success', message: t.languageChanged });
  }, [toast]);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <h1 className="text-h1">{t.title}</h1>
      <Card title={t.language}>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-small text-text-muted mb-2">{t.languageHint}</legend>
          {SUPPORTED.map((l) => (
            <label
              key={l}
              lang={l}
              className="text-body hover:bg-surface-2 has-focus-visible:outline-focus flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 has-focus-visible:outline-2"
            >
              <input
                type="radio"
                name="locale"
                value={l}
                checked={locale === l}
                onChange={() => {
                  if (l !== locale) setLocale(l);
                }}
                className="accent-primary size-5"
              />
              {t.localeNames[l]}
            </label>
          ))}
        </fieldset>
      </Card>
    </div>
  );
}
