import { render } from '@react-email/render';
import { createElement } from 'react';

import { ResetPassword, resetPasswordSubject } from './templates/ResetPassword.js';
import { VerifyEmail, verifyEmailSubject } from './templates/VerifyEmail.js';

export type EmailTemplate = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const TEMPLATES = {
  VERIFY_EMAIL: { component: VerifyEmail, subject: verifyEmailSubject },
  RESET_PASSWORD: { component: ResetPassword, subject: resetPasswordSubject },
} as const;

/** Render email tài khoản thành HTML + plain text (tiếng Việt). */
export async function renderEmail(template: EmailTemplate, link: string): Promise<RenderedEmail> {
  const { component, subject } = TEMPLATES[template];
  const element = createElement(component, { link });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

export { ResetPassword, VerifyEmail };
