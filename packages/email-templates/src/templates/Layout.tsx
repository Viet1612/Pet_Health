import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import { EMAIL_MESSAGES, type EmailLocale } from '../messages.js';

const PRIMARY = '#C2185B';

export interface ActionEmailProps {
  preview: string;
  title: string;
  explanation: string;
  buttonLabel: string;
  link: string;
  expiry: string;
  locale: EmailLocale;
}

/**
 * Bố cục chung của email tài khoản (UI Blueprint §3.5.4): tiêu đề, 1 câu giải thích, 1 nút,
 * 1 dòng hạn, liên kết dạng chữ và dòng "bỏ qua nếu không yêu cầu". Không chứa dữ liệu thú cưng.
 */
export function ActionEmail({
  preview,
  title,
  explanation,
  buttonLabel,
  link,
  expiry,
  locale,
}: ActionEmailProps) {
  const t = EMAIL_MESSAGES[locale].layout;
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
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
            {title}
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>{explanation}</Text>
          <Section style={{ margin: '24px 0' }}>
            <Button
              href={link}
              style={{
                backgroundColor: PRIMARY,
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              {buttonLabel}
            </Button>
          </Section>
          <Text style={{ fontSize: '14px', color: '#5F5D58' }}>{expiry}</Text>
          <Hr style={{ borderColor: '#F1DCE5' }} />
          <Text style={{ fontSize: '12px', color: '#5F5D58' }}>
            {t.copyLink}
            <br />
            <Link href={link} style={{ color: PRIMARY, wordBreak: 'break-all' }}>
              {link}
            </Link>
          </Text>
          <Text style={{ fontSize: '12px', color: '#5F5D58' }}>{t.ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}
