import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

import { locale, m } from '../../i18n';
import { consumeLocaleChanged, SUPPORTED, type Locale } from '../../i18n/locale';
import { cx } from '../../ui/cx';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { useToast } from '../../ui/toast';
import { formatLocalDate, petsQuery } from '../pets';
import { myProfileQuery, PersonalInfoDialog, ProfileFormDialog } from '../social';
import { useChangeLocale, useLogoutAction } from '../session';
import {
  ChangeEmailDialog,
  ChangePasswordDialog,
  DeleteAccountDialog,
  TimezonePickerDialog,
} from './dialogs';
import { meQuery } from './queries';
import { nowIn, timezoneLabel } from './timezones';

const t = m.settings;

export const SETTINGS_SECTIONS = ['account', 'time', 'security', 'danger'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

type Dialog = 'email' | 'password' | 'timezone' | 'delete' | 'personal' | 'profile';

const version = (): string => {
  const v: unknown = import.meta.env.VITE_APP_VERSION;
  return typeof v === 'string' && v ? v : 'dev';
};

/** Một dòng ≥ 56 px, mũi tên bên phải; `danger` chữ đỏ. */
function Row({
  title,
  detail,
  danger = false,
  onClick,
}: {
  title: string;
  detail?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-surface-2 flex min-h-14 w-full items-center gap-3 rounded-md px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className={cx('text-body block font-semibold', danger && 'text-danger')}>
            {title}
          </span>
          {detail && <span className="text-small text-text-muted block">{detail}</span>}
        </span>
        <ChevronRight size={18} aria-hidden className="text-text-muted shrink-0" />
      </button>
    </li>
  );
}

function Group({
  id,
  title,
  children,
}: {
  id: SettingsSection;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`settings-${id}`} className="bg-surface shadow-card rounded-lg p-2">
      <h2
        id={`settings-${id}`}
        className="text-caption text-text-muted px-3 pt-2 pb-1 font-semibold uppercase"
      >
        {title}
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">{children}</ul>
    </section>
  );
}

function LanguagePicker() {
  // Màn này vẽ nhóm Tài khoản 2 lần (phone + ≥ 768 px): mỗi nhóm radio cần `name` riêng, nếu không
  // trình duyệt chỉ tích được một nhóm.
  const group = useId();
  const toast = useToast();
  const change = useChangeLocale();

  useEffect(() => {
    if (consumeLocaleChanged()) toast.show({ kind: 'success', message: t.languageChanged });
  }, [toast]);

  const choose = (l: Locale) => {
    if (l === locale || change.isPending) return;
    change.mutate(l, {
      onError: () => {
        toast.show({ kind: 'error', message: m.error.serverToast });
      },
    });
  };

  return (
    <fieldset className="flex flex-col gap-1 px-3 pb-2">
      <legend className="text-body mb-1 font-semibold">{t.language}</legend>
      <p className="text-small text-text-muted mb-1">{t.languageHint}</p>
      {SUPPORTED.map((l) => (
        <label
          key={l}
          lang={l}
          className="text-body hover:bg-surface-2 has-focus-visible:outline-focus flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 has-focus-visible:outline-2"
        >
          <input
            type="radio"
            name={`locale-${group}`}
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
  );
}

/**
 * SCR-18 Cài đặt (14:1921): Tài khoản (email, ngôn ngữ), Thời gian, Bảo mật, Vùng nguy hiểm.
 * Phone: các nhóm xếp dọc. ≥ 768 px: menu nhóm bên trái + nội dung nhóm đang chọn.
 */
export function SettingsScreen({
  section,
  onSection,
}: {
  section: SettingsSection;
  onSection: (s: SettingsSection) => void;
}) {
  const me = useQuery(meQuery);
  const pets = useQuery(petsQuery);
  const profile = useQuery(myProfileQuery);
  const logout = useLogoutAction();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => {
    setDialog(null);
  };

  if (me.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }
  if (me.isError) return <ErrorState kind="server" onRetry={() => void me.refetch()} />;
  const user = me.data;

  const groups: Record<SettingsSection, ReactNode> = {
    account: (
      <Group id="account" title={t.groups.account}>
        <Row
          title={t.email}
          detail={
            <>
              {t.emailLine(user.email, user.emailVerified)}
              {user.pendingEmail && (
                <span className="text-warning block">{t.pendingEmail(user.pendingEmail)}</span>
              )}
            </>
          }
          onClick={() => {
            setDialog('email');
          }}
        />
        <Row
          title={t.changeEmail}
          onClick={() => {
            setDialog('email');
          }}
        />
        <Row
          title={t.personal}
          detail={[user.nickname, user.birthDate && formatLocalDate(user.birthDate)]
            .filter(Boolean)
            .join(' · ')}
          onClick={() => {
            setDialog('personal');
          }}
        />
        <Row
          title={t.publicProfile}
          detail={profile.data ? `@${profile.data.username}` : t.publicProfileNone}
          onClick={() => {
            setDialog('profile');
          }}
        />
        <li className="border-divider mt-1 border-t pt-2">
          <LanguagePicker />
        </li>
      </Group>
    ),
    time: (
      <Group id="time" title={t.groups.time}>
        <Row
          title={t.timezone}
          detail={t.timezoneLine(timezoneLabel(user.timezone), nowIn(user.timezone))}
          onClick={() => {
            setDialog('timezone');
          }}
        />
      </Group>
    ),
    security: (
      <Group id="security" title={t.groups.security}>
        <Row
          title={t.changePassword}
          onClick={() => {
            setDialog('password');
          }}
        />
        <Row title={t.logout} onClick={() => void logout.run()} />
      </Group>
    ),
    danger: (
      <Group id="danger" title={t.groups.danger}>
        <Row
          title={t.deleteAccount}
          detail={t.deleteHint}
          danger
          onClick={() => {
            setDialog('delete');
          }}
        />
      </Group>
    ),
  };

  return (
    <>
      {/* Phone: mọi nhóm xếp dọc. */}
      <div className="flex flex-col gap-4 md:hidden">
        {SETTINGS_SECTIONS.map((s) => (
          <div key={s}>{groups[s]}</div>
        ))}
      </div>
      {/* ≥ 768 px: menu nhóm + nhóm đang chọn. */}
      <div className="hidden gap-6 md:grid md:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr]">
        <nav aria-label={t.title} className="flex flex-col gap-1">
          {SETTINGS_SECTIONS.map((s) => (
            <Link
              key={s}
              to="/settings"
              search={{ section: s }}
              replace
              aria-current={s === section ? 'page' : undefined}
              onClick={() => {
                onSection(s);
              }}
              className={cx(
                'text-body flex min-h-11 items-center rounded-md px-3 font-semibold',
                s === section ? 'bg-primary-soft text-primary-soft-fg' : 'hover:bg-surface-2',
                s === 'danger' && s !== section && 'text-danger',
              )}
            >
              {t.groups[s]}
            </Link>
          ))}
        </nav>
        <div className="max-w-[760px]">{groups[section]}</div>
      </div>
      <p className="text-small text-text-muted mt-6 text-center">{t.version(version())}</p>

      {dialog === 'email' && <ChangeEmailDialog onClose={close} />}
      {dialog === 'password' && <ChangePasswordDialog onClose={close} />}
      {dialog === 'timezone' && <TimezonePickerDialog current={user.timezone} onClose={close} />}
      {dialog === 'personal' && <PersonalInfoDialog initial={user} onClose={close} />}
      {dialog === 'profile' && profile.isSuccess && (
        <ProfileFormDialog profile={profile.data} suggestedName={user.nickname} onClose={close} />
      )}
      {dialog === 'delete' && (
        <DeleteAccountDialog petCount={pets.data?.length ?? 0} onClose={close} />
      )}
    </>
  );
}
