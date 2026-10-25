import { describe, expect, it } from 'vitest';

import { renderEmail, renderEmailChangedNotice, type EmailTemplate } from './index.js';

const LINK = 'http://localhost:5173/verify-email#token=abc_123';

describe('renderEmail theo ngôn ngữ (S4-09)', () => {
  it.each<[EmailTemplate, string, string]>([
    ['VERIFY_EMAIL', 'Xác minh email Pet Health', 'Verify your Pet Health email'],
    ['RESET_PASSWORD', 'Đặt lại mật khẩu Pet Health', 'Reset your Pet Health password'],
    ['CHANGE_EMAIL', 'Xác nhận email mới cho Pet Health', 'Confirm your new Pet Health email'],
  ])(
    '%s: vi và en có link, không lẫn chuỗi ngôn ngữ kia',
    async (template, viSubject, enSubject) => {
      const vi = await renderEmail(template, LINK, 'vi');
      const en = await renderEmail(template, LINK, 'en');

      expect(vi.subject).toBe(viSubject);
      expect(en.subject).toBe(enSubject);
      for (const r of [vi, en]) {
        expect(r.html).toContain(LINK);
        expect(r.text).toContain(LINK);
      }
      expect(vi.html).toContain('lang="vi"');
      expect(en.html).toContain('lang="en"');
      expect(en.text).not.toMatch(/[ạảãàáâầấậẫẩăằắặẵẳđêềếệễểôồốộỗổơờớợỡởưừứựữử]/i);
      expect(vi.text).not.toContain('Copy this link');
    },
  );

  it('không truyền ngôn ngữ → tiếng Việt (job cũ)', async () => {
    expect((await renderEmail('VERIFY_EMAIL', LINK)).subject).toBe('Xác minh email Pet Health');
  });

  it('thông báo đổi email: email đã che, thời điểm, không có liên kết', async () => {
    const r = await renderEmailChangedNotice({
      maskedNewEmail: 'vi***@example.com',
      at: '14/11/2026 09:00',
    });
    expect(r.subject).toBe('Email tài khoản vừa được đổi');
    expect(r.text).toContain('vi***@example.com');
    expect(r.text).toContain('Nếu không phải bạn, hãy đặt lại mật khẩu ngay.');
    expect(r.html).not.toContain('href');
  });
});
