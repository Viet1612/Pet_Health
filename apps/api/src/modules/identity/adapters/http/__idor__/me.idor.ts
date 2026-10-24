// `/me/*` chỉ đổi tài khoản của phiên, không nhận ID. Body hợp lệ để deny-by-default kiểm 401
// (không bị 422 trước bước kiểm phiên).
import { registerIdorBody } from '../../../../../../test/idor/registry.js';

registerIdorBody('PATCH', '/me/locale', () => ({ locale: 'en' }));
