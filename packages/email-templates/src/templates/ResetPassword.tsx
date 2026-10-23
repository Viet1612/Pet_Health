import { ActionEmail } from './Layout.js';

export const resetPasswordSubject = 'Đặt lại mật khẩu Pet Health';

export function ResetPassword({ link }: { link: string }) {
  return (
    <ActionEmail
      preview={resetPasswordSubject}
      title="Đặt lại mật khẩu"
      explanation="Bấm nút dưới đây để đặt mật khẩu mới cho tài khoản Pet Health."
      buttonLabel="Đặt lại mật khẩu"
      link={link}
      expiry="Liên kết hết hạn sau 60 phút."
    />
  );
}

ResetPassword.PreviewProps = { link: 'http://localhost:5173/reset-password#token=preview' };
export default ResetPassword;
