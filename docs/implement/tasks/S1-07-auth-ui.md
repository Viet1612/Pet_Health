# S1-07 · Giao diện SCR-01→05, route guard

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-001, US-002, US-003, US-004 (và AC 1 của US-006) |
| Yêu cầu | FR-AUTH-001→008, FR-AUTH-014, UXD-009 |
| Phụ thuộc | [S1-03](S1-03-register-api.md), [S1-04](S1-04-login-session-api.md), [S1-05](S1-05-verify-email-api.md), [S1-06](S1-06-password-reset-api.md), [S0-08](S0-08-api-client.md) |
| Ước lượng | 2 |
| Màn hình Figma | SCR-01 · Đăng nhập (14:1772), sai mật khẩu (23:2828), tạm khóa (23:2868); SCR-02 · Đăng ký (14:1807); SCR-03 · Quên mật khẩu (14:1854); SCR-04 · Đặt lại mật khẩu (14:1883); SCR-05 · Xác minh email (14:1906), hết hạn (23:2902) |

## Mục tiêu
Năm màn hình khách theo Figma, nối với API S1-03→06, cùng route guard: khách mở trang cần đăng nhập thì về `/login?next=...`, đăng nhập xong quay lại đúng trang. Khi xong, luồng đăng ký → email (Mailpit) → xác minh → đăng xuất → đăng nhập chạy được trên local (mốc M2).

## Phạm vi
**Trong phạm vi:**
- `AuthLayout` và 5 route `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` (chunk lazy `auth`).
- `features/session`: query phiên, mutation đăng nhập/đăng ký/đăng xuất, giữ `csrfToken` cho `api/`.
- Route guard cho route chủ nuôi và route khách; xử lý `401` toàn cục.
- Mục "Đăng xuất" tạm trong menu của `TopBar`.

**Ngoài phạm vi:**
- Banner nhắc xác minh trên Dashboard: [S5-04](S5-04-dashboard-ui.md).
- Giữ bản nháp form khi hết phiên (`ph.draft.<route>`): [S6-03](S6-03-system-states.md).
- Menu tài khoản đầy đủ, đổi mật khẩu/email: [S6-02](S6-02-settings-ui.md).
- Dark mode: [S6-04](S6-04-dark-mode-a11y.md).

## Chi tiết kỹ thuật

### Cấu trúc `apps/web/src/`
- `app/shell/AuthLayout.tsx`: logo (ô vuông bo góc nền `--primary`, icon chân thú Lucide `PawPrint` trắng) + nội dung. Bố cục theo UXD-009: phone 1 cột toàn màn hình, lề 24 px; tablet (768–1279) thẻ form 440 px giữa nền `--primary-soft`; desktop (≥ 1280) chia đôi: trái 640 px giới thiệu nền `--primary`, phải form 400 px.
- `routes/(auth)/{login,register,forgot-password,reset-password,verify-email}.tsx`.
- `features/session/`: `useSession()` (query key `['session']`, `GET /auth/session`, `retry: false`), `useLogin`, `useRegister`, `useLogout`, `useForgotPassword`, `useResetPassword`, `useVerifyEmail`, `useResendVerification`; `schemas.ts` (Zod client).
- `i18n/vi.ts`: mọi chuỗi ở mục Giao diện.

### Phiên và CSRF
- Sau register/login/session thành công: lưu `csrfToken` vào store bộ nhớ của `api/` (header `X-CSRF-Token` cho mọi method ghi), `queryClient.setQueryData(['session'], ...)`.
- Logout: `POST /auth/logout` → `queryClient.clear()` → xóa `csrfToken` → `navigate('/login')`.

### Route guard (TanStack Router)
- Route chủ nuôi (layout `AppShell`): `beforeLoad` gọi `queryClient.ensureQueryData(['session'])`; `401` → `redirect({ to: '/login', search: { next: location.pathname + location.search } })`. Không render gì, không gọi API dữ liệu trước khi có phiên (US-006 AC 1).
- Route khách `/login`, `/register`, `/forgot-password`, `/reset-password`: có phiên → `redirect('/')`.
- `/verify-email`: mọi người vào được.
- `api/` gặp `401` ở request bất kỳ (trừ `GET /auth/session`, login) → xóa cache phiên → `/login?next=<route hiện tại>`.
- `next` chỉ chấp nhận đường dẫn nội bộ: bắt đầu bằng `/`, không bắt đầu bằng `//` hay `/\`; sai → `/`.

### Token từ fragment
SCR-04 và SCR-05 đọc `token = new URLSearchParams(location.hash.slice(1)).get('token')`, rồi `history.replaceState(null, '', location.pathname + location.search)` để xóa fragment khỏi thanh địa chỉ và lịch sử. Không có token → trạng thái "không hợp lệ".

### Form
React Hook Form + `zodResolver`, `mode: 'onBlur'`, `reValidateMode: 'onChange'` ("kiểm tra tại chỗ khi rời trường"). Lỗi client chặn submit, không gọi API. Lỗi server: `problem.errors[]` → `setError(field, { message })` dưới trường; focus tới trường lỗi đầu tiên. Nút submit hiện spinner, giữ bề rộng (CMP-01). Không tự gửi lại khi timeout; hiện toast lỗi có "Thử lại" (người dùng bấm). `<title>` = "Tên màn hình · Pet Health"; focus về `h1` khi đổi route.

| Trường | Quy tắc client | Thông điệp |
|---|---|---|
| Email | bắt buộc, định dạng email | "Trường bắt buộc" · "Email không đúng định dạng" |
| Mật khẩu (đăng ký, đặt lại) | 8–128 ký tự | "Mật khẩu cần 8–128 ký tự" |
| Mật khẩu (đăng nhập) | bắt buộc | "Trường bắt buộc" |

Ô mật khẩu có nút chữ "Hiện"/"Ẩn" bên phải (`aria-pressed`), `autocomplete` = `current-password` (đăng nhập) hoặc `new-password` (đăng ký, đặt lại); ô email `type="email"`, `autocomplete="email"`.

## Giao diện

**SCR-01 · Đăng nhập** (`/login`, 14:1772): logo, "Pet Health", phụ đề "Sổ sức khỏe cho thú cưng của bạn"; trường "Email", "Mật khẩu" (nút "Hiện"); nút chính "Đăng nhập"; liên kết "Quên mật khẩu?"; chân trang "Chưa có tài khoản? **Đăng ký**".
- Sai (23:2828, `401`): hộp lỗi nền đỏ nhạt có icon trên form "Email hoặc mật khẩu không đúng" (`role="alert"`), viền ô mật khẩu đỏ, giữ email, giữ mật khẩu để sửa.
- Tạm khóa (23:2868, `423`): hộp cảnh báo nền vàng có icon ổ khóa "Đăng nhập sai 5 lần. Vui lòng thử lại sau N phút." với `N = ceil(retryAfter / 60)`, cập nhật mỗi 30 s; ô mật khẩu xóa trống; nút "Đăng nhập" disabled tới khi hết thời gian, rồi hộp cảnh báo biến mất.
- Hết phiên (đến từ `401` toàn cục): hộp thông tin "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." (phần giữ bản nháp ở [S6-03](S6-03-system-states.md)).
- Thành công → `next` hoặc `/`.

**SCR-02 · Đăng ký** (`/register`, 14:1807): tiêu đề "Tạo tài khoản", phụ đề "Lưu hồ sơ và lịch y tế của thú cưng trên mọi thiết bị"; "Email"; "Mật khẩu" (nút "Hiện", gợi ý "8–128 ký tự · nên dùng cụm từ dễ nhớ", thanh độ dài đổi màu khi đạt 8); "Múi giờ" (select danh sách `Intl.supportedValuesOf('timeZone')`, mặc định "Asia/Ho_Chi_Minh (GMT+7)", gợi ý "Dùng để tính "hôm nay" và giờ nhắc · đổi được trong Cài đặt"); nút "Đăng ký"; chân trang "Đã có tài khoản? **Đăng nhập**".
- `409 EMAIL_TAKEN` → dưới trường Email: icon + "Email đã được sử dụng", viền đỏ.
- Thành công → `/` (Dashboard trống).

**SCR-03 · Quên mật khẩu** (`/forgot-password`, 14:1854): thanh trên có nút quay lại (`aria-label="Quay lại"`, về `/login`) + "Quên mật khẩu"; câu dẫn "Nhập email tài khoản. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu."; "Email"; nút "Gửi liên kết".
- Sau `202` (luôn như nhau): hộp xanh có icon thư "Nếu email có tài khoản, liên kết đặt lại đã được gửi (hiệu lực 60 phút). Kiểm tra cả thư mục Spam." (`role="status"`) và nút chữ "Gửi lại" (gửi lại cùng email).
- `429` → hộp lỗi "Bạn đã yêu cầu quá nhiều lần. Thử lại sau N phút."

**SCR-04 · Đặt lại mật khẩu** (`/reset-password#token=`, 14:1883): tiêu đề "Đặt mật khẩu mới"; "Mật khẩu mới" (nút "Hiện", gợi ý "8–128 ký tự"); nút "Đặt mật khẩu"; dòng chú thích "Đặt lại thành công sẽ đăng xuất khỏi mọi thiết bị khác."
- Thành công (`204`) → `/login` kèm toast "Đã đặt mật khẩu mới. Đăng nhập để tiếp tục."
- `410`/`400` → `ErrorState` "Liên kết đã hết hạn" / "Liên kết đã được sử dụng" / "Liên kết không hợp lệ" + nút "Gửi lại liên kết" (về `/forgot-password`).

**SCR-05 · Xác minh email** (`/verify-email#token=`): tự gọi `POST /auth/verify-email` khi mở (một lần, kể cả StrictMode).
- Đang xác minh: skeleton icon + dòng "Đang xác minh…".
- Thành công (14:1906): vòng tròn xanh nhạt có dấu tích, "Email đã được xác minh", "Bạn có thể lấy lại mật khẩu qua <email> khi cần.", nút "Vào Tổng quan" (có phiên → `/`; không có → `/login?next=/`). Có phiên thì cập nhật cache `['session']` với `emailVerified: true`.
- Hết hạn (23:2902): vòng tròn vàng nhạt có icon thư, "Liên kết đã hết hạn", "Liên kết xác minh chỉ có hiệu lực 24 giờ và dùng được một lần. Gửi lại để nhận liên kết mới.", nút "Gửi lại email xác minh", liên kết "Về Tổng quan".
- Đã dùng / sai: cùng bố cục, tiêu đề "Liên kết đã được sử dụng" / "Liên kết không hợp lệ", cùng nút "Gửi lại email xác minh".
- "Gửi lại email xác minh": có phiên → `POST /auth/verify-email/resend` → hộp xanh "Đã gửi lại email xác minh. Kiểm tra cả thư mục Spam."; `429` → "Bạn đã gửi lại quá nhiều lần. Thử lại sau N phút."; không có phiên → `/login?next=/verify-email?resend=1`, quay lại thì trang thấy `resend=1` và tự gửi lại một lần.

**Đăng xuất:** mục "Đăng xuất" trong menu của `TopBar` (phone) / rail (≥ 768).

## Tiêu chí chấp nhận
- [ ] **Given** khách chưa có tài khoản, **When** nhập email hợp lệ và mật khẩu ≥ 8 ký tự rồi bấm "Đăng ký", **Then** vào Dashboard và email xác minh tới Mailpit trong 1 phút.
- [ ] **Given** email đã có tài khoản, **When** đăng ký lại, **Then** "Email đã được sử dụng" hiện dưới trường Email.
- [ ] **Given** mật khẩu < 8 ký tự hoặc email sai định dạng, **When** bấm "Đăng ký", **Then** lỗi hiện ngay dưới trường và không có request nào tới server.
- [ ] **Given** tài khoản chưa xác minh, **When** mở liên kết xác minh trong 24 giờ, **Then** hiện "Email đã được xác minh" và "Vào Tổng quan" đưa vào Dashboard.
- [ ] **Given** liên kết quá 24 giờ, **When** mở, **Then** hiện "Liên kết đã hết hạn" kèm nút "Gửi lại email xác minh".
- [ ] **Given** tài khoản đã tồn tại, **When** nhập đúng email và mật khẩu, **Then** vào Dashboard (hoặc trang `next`).
- [ ] **Given** sai email hoặc mật khẩu, **When** đăng nhập, **Then** hiện "Email hoặc mật khẩu không đúng", giống nhau cho cả hai nguyên nhân.
- [ ] **Given** 5 lần sai liên tiếp trong 15 phút, **When** thử lần thứ 6, **Then** hiện hộp tạm khóa với số phút còn lại và nút "Đăng nhập" bị khóa.
- [ ] **Given** đã đăng nhập, **When** bấm "Đăng xuất", **Then** về `/login`; mở lại URL trang dữ liệu bất kỳ thì bị chuyển về `/login`.
- [ ] Màn Quên mật khẩu luôn hiện cùng hộp "đã gửi" dù email có tài khoản hay không.
- [ ] Liên kết đặt lại mở SCR-04; đặt mật khẩu thành công thì về `/login`; liên kết hết hạn hoặc đã dùng hiện `ErrorState` + "Gửi lại liên kết".
- [ ] **Given** chưa đăng nhập, **When** mở trực tiếp `/pets` (hoặc route chủ nuôi bất kỳ), **Then** chuyển về `/login?next=%2Fpets`, không có request dữ liệu nào ngoài `GET /auth/session`; đăng nhập xong quay lại `/pets`.
- [ ] `next=https://evil.example` hoặc `next=//evil.example` → sau đăng nhập về `/`.
- [ ] Fragment `#token=` bị xóa khỏi thanh địa chỉ ngay sau khi đọc.
- [ ] Bố cục đúng 3 khoảng: 390 px (1 cột), 834 px (thẻ 440 px), 1440 px (chia đôi); không có thanh cuộn ngang.
- [ ] Dùng được hoàn toàn bằng bàn phím; lỗi trường gắn `aria-describedby`, `aria-invalid`; hộp lỗi đăng nhập có `role="alert"`.

## Kiểm thử
- **Unit (Vitest + Testing Library):** schema client (biên 7/8/128/129 ký tự, email sai); hàm `safeNext()`; hàm đọc token từ fragment; form đăng ký không gọi API khi lỗi client; map `409` vào trường Email; hộp tạm khóa tính phút làm tròn lên (`retryAfter` 61 → "2 phút").
- **E2E (Playwright, stack compose + Mailpit, viewport 390 × 844 và 1440 × 900):**
  1. Đăng ký → đọc thư Mailpit → mở liên kết → "Email đã được xác minh" → Dashboard.
  2. Đăng xuất → mở `/pets` → bị chuyển `/login?next=%2Fpets` → đăng nhập → ở `/pets`.
  3. Sai mật khẩu 5 lần → lần 6 thấy hộp tạm khóa.
  4. Quên mật khẩu → thư Mailpit → đặt mật khẩu mới → đăng nhập bằng mật khẩu mới.
  5. Liên kết xác minh hết hạn (dùng `POST /__test/clock` +25 h) → trạng thái hết hạn → gửi lại.
- **axe-core** trên 5 màn hình, không có vi phạm mức serious/critical.

## Ghi chú
- Frame SCR-04 có dòng "Cho tài khoản viet@example.com", nhưng API không trả email theo token reset. Bỏ dòng này ở Giai đoạn 1 (không đưa email vào URL).
- Các chuỗi chưa có trong Figma/Blueprint (định dạng email, 429, toast sau đặt lại, trạng thái đã dùng/sai) là đề xuất; gom trong `i18n/vi.ts` để chỉnh một chỗ.
