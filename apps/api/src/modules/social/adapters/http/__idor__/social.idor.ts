// Bảng mạng xã hội (F-02): hồ sơ đọc công khai cho người đã đăng nhập; ghi chỉ qua `/me/*`.
import { exemptFromIdor, registerIdorBody } from '../../../../../../test/idor/registry.js';

exemptFromIdor(
  'GET',
  '/profiles/:username',
  'Hồ sơ công khai cho mọi người đã đăng nhập (D1); không có dữ liệu riêng tư, chặn nhau → 404 do RLS',
);

// Body hợp lệ để ca "401 khi không có phiên" không dừng ở bước kiểm body.
registerIdorBody('PUT', '/me/profile', () => ({ username: 'idor.user', displayName: 'IDOR' }));

// F-07: theo dõi theo username. Ghi chỉ dòng của chính mình (`follower_id = app_user()`), đọc là
// danh sách công khai cho người đã đăng nhập.
for (const [method, url] of [
  ['PUT', '/follows/:username'],
  ['DELETE', '/follows/:username'],
  ['GET', '/profiles/:username/followers'],
  ['GET', '/profiles/:username/following'],
] as const) {
  exemptFromIdor(
    method,
    url,
    'Tham số là username công khai; thao tác chỉ ghi dòng follows của chính người gọi (RLS)',
  );
}

// F-09: tim và bình luận trên bài đã đăng (đọc công khai có chủ đích); ghi chỉ dòng của chính
// người gọi (RLS `user_id`/`owner_id = app_user()`).
for (const [method, url] of [
  ['PUT', '/posts/:id/like'],
  ['DELETE', '/posts/:id/like'],
  ['GET', '/posts/:id/likes'],
  ['GET', '/posts/:id/comments'],
  ['POST', '/posts/:id/comments'],
] as const) {
  exemptFromIdor(
    method,
    url,
    'Bài đã đăng đọc công khai; tim/bình luận chỉ ghi dòng của người gọi',
  );
}

// F-12: chặn theo username; chỉ ghi dòng `blocks` của chính người gọi (RLS `blocker_id`).
exemptFromIdor('PUT', '/blocks/:username', 'Chỉ ghi dòng chặn của chính người gọi (RLS)');
exemptFromIdor('DELETE', '/blocks/:username', 'Chỉ xóa dòng chặn của chính người gọi (RLS)');
