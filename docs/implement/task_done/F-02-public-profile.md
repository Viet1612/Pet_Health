# F-02 · Hồ sơ công khai, nickname và ngày sinh — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-02](../tasks-feed/F-02-public-profile.md) |
| Trạng thái | Xong, E2E API + IDOR Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### API

- **Migration:**
  - `202610261200_social_profiles`:
    - `users.nickname` (NULL cho tài khoản cũ).
    - Hàm `app_user()`.
    - Bảng `profiles` (username `citext` UNIQUE, kiểm `^[a-z0-9._]{3,30}$`).
    - `uploads.target_kind` thêm `USER_AVATAR`, `POST_PHOTO`.
  - `202610261220_user_birth_date`: `users.birth_date date NULL`, `>= 1900-01-01`.
  - `202610261230_profiles_username_changed_null`: `username_changed_at` NULL nghĩa là chưa đổi lần nào. Trước đó cột này được so với `created_at`, nên sai khi tạo và đổi cùng một thời điểm (E2E đồng hồ đứng yên bắt được lỗi này).
  - Cả ba đã chạy trên DB dev.
- **Đăng ký:**
  - `POST /auth/register` bắt buộc `nickname` (1–50 ký tự sau trim) và `birthDate`.
  - `birthDate` phải là ngày có thật, từ 1900-01-01 tới hôm nay theo múi giờ tài khoản; ngày tương lai → `FUTURE_DATE`.
  - `PATCH /me` nhận `timezone`, `nickname`, `birthDate` (ít nhất một trường).
  - `UserDto` có `nickname`, `birthDate`.
- **Mô-đun `social`:**
  - `domain/username.ts`: chuẩn hóa chữ thường; không bắt đầu hay kết thúc bằng `.`, không có `..`; danh sách tên cấm (`admin`, `me`, `feed`, `u`…); đổi username tối đa 1 lần/14 ngày.
  - `profile.repository.ts`. Số bài, người theo dõi, đang theo dõi được đếm bằng truy vấn dưới RLS (không dùng trigger đếm).
  - Route:
    - `GET /me/profile`: `404 PROFILE_NOT_SET` khi chưa tạo.
    - `PUT /me/profile`: tạo hoặc sửa. Username sai → `422 USERNAME_INVALID`; tên cấm → `422 USERNAME_RESERVED`; trùng → `409 USERNAME_TAKEN` (dựa vào UNIQUE); đổi lại trong 14 ngày → `429 USERNAME_CHANGE_TOO_SOON` kèm `params.days`.
    - `GET /profiles/check?username=`: rate limit 30 lần/phút/người.
    - `GET /profiles/{username}`: không có email, không có dữ liệu sức khỏe; hai người đã chặn nhau → 404.
    - `PUT /me/avatar` và `DELETE /me/avatar`: ảnh vào `u/{user}/profile/avatar/`. Worker gắn qua `TargetResolver` `USER_AVATAR`; ảnh xử lý sau cùng thắng.
- **IDOR:** miễn kiểm `GET /profiles/:username` (đọc công khai có chủ đích); thêm body hợp lệ cho `PUT /me/profile`.
- **Xóa tài khoản:** hồ sơ bị xóa theo `ON DELETE CASCADE`; ảnh nằm dưới `u/{user}/` nên job purge sẵn có xóa luôn.

### Web

- **Đăng ký:** thêm ô **Nickname** và **Ngày sinh** (bắt buộc; không cho chọn ngày sau hôm nay).
- **Tài khoản cũ** thiếu nickname hoặc ngày sinh → hộp "Bổ sung thông tin tài khoản" khi mở app (`CompleteAccountPrompt` trong AppShell).
- **Menu tài khoản** (phone) hiện nickname phía trên email.
- **Điều hướng:** thêm mục **Bản tin** (`/feed`) ở giữa thanh dưới và trên rail. Mục này cũng sáng khi đang ở `/u/...`.
- **`/feed`:**
  - Chưa có hồ sơ → màn "Tạo hồ sơ công khai". Tên hiển thị điền sẵn bằng nickname; username được kiểm trùng 400 ms sau khi ngừng gõ (hiện ✓ hoặc lỗi). Tạo xong thì chuyển tới hồ sơ.
  - Đã có hồ sơ → chỗ giữ chỗ của bản tin (F-08) kèm nút "Xem hồ sơ của tôi".
- **`/u/{username}`:** đầu trang hồ sơ (ảnh, số bài / người theo dõi / đang theo dõi, tên, @username, giới thiệu). Hồ sơ của mình có nút "Sửa hồ sơ"; hồ sơ không tồn tại → "Không tìm thấy hồ sơ này".
- **Cài đặt › Tài khoản:** thêm dòng "Nickname và ngày sinh" và dòng "Hồ sơ công khai" (tạo hoặc sửa; trong hộp sửa có đổi và gỡ ảnh đại diện).
- **Mã dùng chung:** tách `uploadImageAt(path, …)` ra khỏi `uploadAvatar` để dùng cho `/me/avatar`.
- **i18n:** chuỗi vi/en cho mọi phần trên và mã lỗi mới.

## Tiêu chí chấp nhận

- **Đăng ký và tài khoản:**
  - Nickname và ngày sinh bắt buộc khi đăng ký; ngày tương lai → 422 `FUTURE_DATE`; `PATCH /me` sửa được cả hai.
  - Đã kiểm bằng `e2e/api/social-profile.api.spec.ts` và `core-flow.ui.spec.ts` (đăng ký qua giao diện có điền hai ô mới).
- **Hồ sơ công khai:**
  - Tạo hồ sơ → tài khoản khác xem được `/profiles/{username}`; phản hồi không chứa email.
  - Username trùng → 409; tên cấm → 422; `GET /profiles/check` đúng.
  - Đổi lần đầu được ngay; lần 2 → 429 `days: 14`; sau 14 ngày đổi lại được; sửa tên hiển thị vẫn được trong lúc bị khóa đổi username.
  - Đã kiểm bằng E2E API.
- **Test tự động:**
  - Unit `test/social-domain.test.ts` (username, ngày sinh) Pass.
  - IDOR 104/104 Pass.
  - Toàn bộ E2E (51 ca) Pass.
- **Chưa kiểm tự động:**
  - Tải ảnh đại diện hồ sơ (dùng chung pipeline ảnh đã kiểm ở S2).
  - Xóa tài khoản → `/u/{username}` 404 (theo thiết kế CASCADE).
