import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { useChangeLocale } from '../../features/session';
import { locale, m } from '../../i18n';
import { consumeLocaleChanged, SUPPORTED, type Locale } from '../../i18n/locale';
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
  const change = useChangeLocale();

  const choose = (l: Locale) => {
    if (l === locale || change.isPending) return;
    // Lưu vào tài khoản (S4-09) rồi tải lại; lỗi thì giữ ngôn ngữ cũ.
    change.mutate(l, {
      onError: (err) => {
        const msg = toUserMessage(err);
        toast.show({
          kind: 'error',
          message: 'message' in msg ? msg.message : m.error.serverToast,
          onRetry: () => {
            choose(l);
          },
        });
      },
    });
  };

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
                checked={(change.isPending ? change.variables : locale) === l}
                disabled={change.isPending}
                onChange={() => {
                  choose(l);
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
