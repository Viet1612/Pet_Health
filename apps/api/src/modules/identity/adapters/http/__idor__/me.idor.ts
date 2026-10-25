// `/me/*` chỉ đổi tài khoản của phiên, không nhận ID. Body hợp lệ để deny-by-default kiểm 401
// (không bị 422 trước bước kiểm phiên).
import { registerIdorBody } from '../../../../../../test/idor/registry.js';

registerIdorBody('PATCH', '/me/locale', () => ({ locale: 'en' }));
registerIdorBody('PATCH', '/me', () => ({ timezone: 'Asia/Ho_Chi_Minh' }));
registerIdorBody('POST', '/me/password', () => ({
  currentPassword: 'mat-khau-cu-123',
  newPassword: 'mat-khau-moi-123',
}));
registerIdorBody('POST', '/me/email', () => ({
  newEmail: 'moi@example.test',
  password: 'mat-khau-cu-123',
}));
registerIdorBody('DELETE', '/me', () => ({ password: 'mat-khau-cu-123' }));
