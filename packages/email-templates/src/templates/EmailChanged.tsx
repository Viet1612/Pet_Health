import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';

import { EMAIL_MESSAGES, type EmailLocale } from '../messages.js';

/**
 * Thông báo tới email cũ sau khi đổi email (FR-AUTH-015): chỉ email mới đã che và thời điểm, không
 * có liên kết.
 */
export function EmailChanged({
  maskedNewEmail,
  at,
  locale = 'vi',
}: {
  maskedNewEmail: string;
  at: string;
  locale?: EmailLocale;
}) {
  const t = EMAIL_MESSAGES[locale].emailChanged;
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.subject}</Preview>
      <Body
        style={{ backgroundColor: '#FDF7F9', fontFamily: 'Arial, sans-serif', color: '#1C1B1A' }}
      >
        <Container
          style={{
            backgroundColor: '#FFFFFF',
            margin: '24px auto',
            padding: '24px',
            maxWidth: '480px',
            borderRadius: '12px',
          }}
        >
          <Heading as="h1" style={{ fontSize: '22px', margin: '0 0 12px' }}>
            {t.title}
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>{t.body(maskedNewEmail, at)}</Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 600 }}>{t.warning}</Text>
        </Container>
      </Body>
    </Html>
  );
}

EmailChanged.PreviewProps = { maskedNewEmail: 'vi***@example.com', at: '25/10/2026 18:40' };
export default EmailChanged;
