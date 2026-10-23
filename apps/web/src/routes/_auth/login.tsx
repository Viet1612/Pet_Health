import { createFileRoute } from '@tanstack/react-router';

// Giữ chỗ: màn hình SCR-01 Đăng nhập làm ở S1-07.
export const Route = createFileRoute('/_auth/login')({
  staticData: { title: 'Đăng nhập' },
  component: () => <h1 className="text-h1">Đăng nhập</h1>,
});
