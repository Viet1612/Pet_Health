// Bảng mạng xã hội (F-02): hồ sơ đọc công khai cho người đã đăng nhập; ghi chỉ qua `/me/*`.
import { exemptFromIdor, registerIdorBody } from '../../../../../../test/idor/registry.js';

exemptFromIdor(
  'GET',
  '/profiles/:username',
  'Hồ sơ công khai cho mọi người đã đăng nhập (D1); không có dữ liệu riêng tư, chặn nhau → 404 do RLS',
);

// Body hợp lệ để ca "401 khi không có phiên" không dừng ở bước kiểm body.
registerIdorBody('PUT', '/me/profile', () => ({ username: 'idor.user', displayName: 'IDOR' }));
