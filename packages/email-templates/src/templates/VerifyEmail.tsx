import { ActionEmail } from './Layout.js';

export const verifyEmailSubject = 'Xác minh email Pet Health';

export function VerifyEmail({ link }: { link: string }) {
  return (
    <ActionEmail
      preview={verifyEmailSubject}
      title="Xác minh email"
      explanation="Bấm nút dưới đây để xác minh địa chỉ email của tài khoản Pet Health."
      buttonLabel="Xác minh email"
      link={link}
      expiry="Liên kết hết hạn sau 24 giờ."
    />
  );
}

VerifyEmail.PreviewProps = { link: 'http://localhost:5173/verify-email#token=preview' };
export default VerifyEmail;
