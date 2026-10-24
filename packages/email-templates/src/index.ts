import { render } from '@react-email/render';
import { createElement } from 'react';

import { EMAIL_MESSAGES, type EmailLocale } from './messages.js';
import { ResetPassword } from './templates/ResetPassword.js';
import { VerifyEmail } from './templates/VerifyEmail.js';

export type { EmailLocale } from './messages.js';

export type EmailTemplate = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const TEMPLATES = {
  VERIFY_EMAIL: { component: VerifyEmail, key: 'verifyEmail' },
  RESET_PASSWORD: { component: ResetPassword, key: 'resetPassword' },
} as const;

/** Render email tài khoản thành HTML + plain text theo ngôn ngữ của tài khoản (mặc định vi). */
export async function renderEmail(
  template: EmailTemplate,
  link: string,
  locale: EmailLocale = 'vi',
): Promise<RenderedEmail> {
  const { component, key } = TEMPLATES[template];
  const subject = EMAIL_MESSAGES[locale][key].subject;
  const element = createElement(component, { link, locale });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

export { ResetPassword, VerifyEmail };
