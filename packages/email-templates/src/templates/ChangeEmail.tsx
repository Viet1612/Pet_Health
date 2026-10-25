import { EMAIL_MESSAGES, type EmailLocale } from '../messages.js';
import { ActionEmail } from './Layout.js';

export function ChangeEmail({ link, locale = 'vi' }: { link: string; locale?: EmailLocale }) {
  const t = EMAIL_MESSAGES[locale].changeEmail;
  return (
    <ActionEmail
      preview={t.subject}
      title={t.title}
      explanation={t.explanation}
      buttonLabel={t.buttonLabel}
      link={link}
      expiry={t.expiry}
      locale={locale}
    />
  );
}

ChangeEmail.PreviewProps = { link: 'http://localhost:5173/verify-email#token=preview' };
export default ChangeEmail;
