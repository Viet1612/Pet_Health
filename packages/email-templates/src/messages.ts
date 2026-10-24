/** Ngôn ngữ email, khớp `users.locale` (S4-09). */
export type EmailLocale = 'vi' | 'en';

interface ActionCopy {
  subject: string;
  title: string;
  explanation: string;
  buttonLabel: string;
  expiry: string;
}

interface EmailMessages {
  layout: { copyLink: string; ignore: string };
  verifyEmail: ActionCopy;
  resetPassword: ActionCopy;
}

/** Chuỗi email theo ngôn ngữ; thiếu key ở một ngôn ngữ là lỗi typecheck. */
export const EMAIL_MESSAGES: Record<EmailLocale, EmailMessages> = {
  vi: {
    layout: {
      copyLink: 'Nút không bấm được? Sao chép liên kết sau vào trình duyệt:',
      ignore: 'Nếu bạn không yêu cầu, hãy bỏ qua email này.',
    },
    verifyEmail: {
      subject: 'Xác minh email Pet Health',
      title: 'Xác minh email',
      explanation: 'Bấm nút dưới đây để xác minh địa chỉ email của tài khoản Pet Health.',
      buttonLabel: 'Xác minh email',
      expiry: 'Liên kết hết hạn sau 24 giờ.',
    },
    resetPassword: {
      subject: 'Đặt lại mật khẩu Pet Health',
      title: 'Đặt lại mật khẩu',
      explanation: 'Bấm nút dưới đây để đặt mật khẩu mới cho tài khoản Pet Health.',
      buttonLabel: 'Đặt lại mật khẩu',
      expiry: 'Liên kết hết hạn sau 60 phút.',
    },
  },
  en: {
    layout: {
      copyLink: 'Button not working? Copy this link into your browser:',
      ignore: "If you didn't request this, you can ignore this email.",
    },
    verifyEmail: {
      subject: 'Verify your Pet Health email',
      title: 'Verify your email',
      explanation: 'Click the button below to verify the email address of your Pet Health account.',
      buttonLabel: 'Verify email',
      expiry: 'This link expires in 24 hours.',
    },
    resetPassword: {
      subject: 'Reset your Pet Health password',
      title: 'Reset your password',
      explanation: 'Click the button below to set a new password for your Pet Health account.',
      buttonLabel: 'Reset password',
      expiry: 'This link expires in 60 minutes.',
    },
  },
};
