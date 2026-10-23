# S1-07 · Giao diện SCR-01→05, route guard — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-07](../tasks/S1-07-auth-ui.md) |
| Trạng thái | Xong (code), chưa chạy thử trên trình duyệt |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `3d0ed02` |

## Kết quả

- **Phiên (`features/session/`):**
  - `sessionQuery` (key `['session']`, `401` → `null`), cùng các hook `useSession`, `useLogin`, `useRegister`, `useLogout`, `useForgotPassword`, `useResetPassword`, `useVerifyEmail`, `useResendVerification`.
  - Đăng nhập / đăng ký / xác minh thành công thì ghi phiên vào cache và lưu `csrfToken` cho api-client.
  - `useLogout` xóa CSRF và toàn bộ cache.
  - `utils.ts`: `safeNext` chỉ nhận đường dẫn tương đối bắt đầu bằng `/`, chặn `//` và `/\`; `takeFragmentToken` đọc `#token=` rồi xóa fragment bằng `history.replaceState`; `minutesFrom`; `nowMs`.
  - `LinkProblem`: trạng thái liên kết hết hạn / đã dùng / không hợp lệ, dùng chung cho SCR-04 và SCR-05.
- **API client (`api/client.ts`):**
  - `401` từ endpoint bất kỳ, trừ `GET /auth/session` và `POST /auth/login`, phát sự kiện `ph:session-expired`.
  - `useSessionExpiredRedirect` (gắn ở `__root`) xóa phiên trong cache và chuyển về `/login?next=<hiện tại>&expired=1`.
- **Route guard:**
  - `_app.beforeLoad`: chưa có phiên thì `redirect` về `/login?next=...` trước khi render, nên chỉ có request `GET /auth/session`.
  - `_auth.beforeLoad`: đã có phiên thì về `/`; riêng `/verify-email` mở cho mọi người.
- **Màn hình:**
  - SCR-01 `/login`: lỗi sai thông tin trong `Alert role="alert"`; tạm khóa có đếm ngược số phút và khóa nút; có thông báo "phiên hết hạn".
  - SCR-02 `/register`: chọn múi giờ (`Intl.supportedValuesOf`, mặc định `Asia/Ho_Chi_Minh`), thanh độ dài mật khẩu, `EMAIL_TAKEN` hiện dưới trường Email.
  - SCR-03 `/forgot-password`: luôn hiện cùng hộp "đã gửi" với nút "Gửi lại"; `429` hiện số phút chờ.
  - SCR-04 `/reset-password#token=`: thành công thì toast và về `/login`; `400`/`410` hiện `LinkProblem` kèm "Gửi lại liên kết".
  - SCR-05 `/verify-email#token=`: tự gọi xác minh một lần (chặn StrictMode chạy hai lần bằng `useRef`); hiện thành công hoặc `LinkProblem` kèm "Gửi lại email xác minh". Chưa đăng nhập thì nút gửi lại đưa về `/login?next=/verify-email?resend=1`; quay lại trang sẽ tự gửi một lần.
- **Bố cục:** `AuthLayout` có 3 khoảng (phone 1 cột, tablet thẻ 440 px, desktop chia đôi).
- **Component UI mới:** `TextField`, `PasswordField` (nút Hiện/Ẩn có `aria-pressed`), `Alert`. Lỗi trường gắn `aria-invalid` và `aria-describedby`.
- **Đăng xuất:** mục "Đăng xuất" trong menu TopBar (phone) và nút dưới cùng SideRail (≥ 768 px). Gọi API xong (kể cả khi lỗi mạng) thì về `/login`.
- **Chuỗi:** thêm nhóm `vi.auth` vào `i18n/vi.ts`.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint, `vite build`.

**Chưa kiểm** (cần chạy API + DB + trình duyệt): toàn bộ các luồng Given/When/Then, bố cục 3 khoảng, dùng bằng bàn phím, xóa fragment trên thanh địa chỉ, `next` độc hại → `/`.

## Khác với file task

- **Gọi hàm phiên trong `beforeLoad`** dùng `queryClient.query({ ...sessionQuery, staleTime: 'static' })` vì `ensureQueryData` đã deprecated trong bản TanStack Query đang dùng. `redirect(..., throw: true)` thay cho `throw redirect(...)` để qua rule `only-throw-error`.
- **`Date.now()` gom vào `nowMs()`** vì rule React Compiler `react-hooks/purity` báo lỗi khi gọi trực tiếp trong component.
- **Menu phone** hiện chỉ có mục Đăng xuất; các mục khác thêm ở task sau.
- **Chưa có test component** (Testing Library) cho các màn; sẽ bổ sung khi cần.

## Chỉnh sau khi chạy thử (2026-10-24)

- **Bố cục desktop làm lại:**
  - Chia đôi từ 1024 px (spec ghi 1280 px), để laptop màn nhỏ cũng có bố cục 2 cột.
  - Cột trái rộng 45%: họa tiết chân thú, khẩu hiệu cỡ lớn, 3 tính năng chính.
  - Cột phải: form nằm trong thẻ trắng 440 px có bóng nhẹ, trên nền `primary-soft`.
- **Chỉ dùng giao diện sáng:** bỏ bộ token dark mode trong `tokens.css`; `index.html` khai báo `color-scheme: light`.
- **Màn rộng (≥ 1536 px):** cột trái không còn giới hạn 720 px (tối đa 1100 px), chữ và icon to hơn. Thẻ form rộng dần 440 → 500 → 560 → 620 px (≥ 1920 px), padding và tiêu đề lớn hơn.
