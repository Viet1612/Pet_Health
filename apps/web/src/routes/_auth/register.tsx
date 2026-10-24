import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@ph/api-client';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { problemText, toUserMessage } from '../../api/to-user-message';
import { registerSchema, useRegister, type RegisterValues } from '../../features/session';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { PasswordField } from '../../ui/PasswordField';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';

const t = m.auth.register;
const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

function timezoneLabel(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    return offset ? `${tz} (${offset})` : tz;
  } catch {
    return tz;
  }
}

/** SCR-02 · Đăng ký (14:1807). */
function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const register = useRegister();
  const timezones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', timezone: DEFAULT_TZ },
  });
  const passwordLength = Array.from(useWatch({ control: form.control, name: 'password' })).length;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
      await navigate({ to: '/' });
    } catch (err) {
      const message = toUserMessage(err);
      if (message.kind === 'fields') {
        let first = true;
        for (const [field, text] of Object.entries(message.fields)) {
          if (field === 'email' || field === 'password' || field === 'timezone') {
            form.setError(field, { message: text }, { shouldFocus: first });
            first = false;
          }
        }
        return;
      }
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        form.setError('email', { message: problemText(err.problem) }, { shouldFocus: true });
        return;
      }
      if ('message' in message) toast.show({ kind: 'error', message: message.message });
    }
  });

  return (
    <>
      <h1 className="text-h1 mb-1">{t.title}</h1>
      <p className="text-body text-text-muted mb-6">{t.subtitle}</p>

      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <TextField
          label={m.auth.email}
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label={m.auth.password}
            autoComplete="new-password"
            hint={t.passwordHint}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <div aria-hidden className="bg-surface-2 h-1 overflow-hidden rounded-full">
            <div
              className={cx(
                'duration-base h-full transition-all',
                passwordLength >= 8 ? 'bg-success' : 'bg-warning',
              )}
              style={{ width: `${String(Math.min(100, (passwordLength / 8) * 100))}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-timezone" className="text-small font-semibold">
            {m.auth.timezone}
          </label>
          <select
            id="register-timezone"
            aria-describedby="register-timezone-hint"
            className="border-border bg-surface text-body min-h-12 rounded-md border px-3"
            {...form.register('timezone')}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz === DEFAULT_TZ ? `${tz} (GMT+7)` : timezoneLabel(tz)}
              </option>
            ))}
          </select>
          <p id="register-timezone-hint" className="text-small text-text-muted">
            {t.timezoneHint}
          </p>
        </div>

        <Button type="submit" fullWidth loading={register.isPending}>
          {t.submit}
        </Button>
      </form>

      <p className="text-body text-text-muted mt-8 text-center">
        {t.hasAccount}{' '}
        <Link to="/login" className="text-primary font-bold">
          {t.toLogin}
        </Link>
      </p>
    </>
  );
}

export const Route = createFileRoute('/_auth/register')({
  staticData: { title: t.title },
  component: RegisterPage,
});
