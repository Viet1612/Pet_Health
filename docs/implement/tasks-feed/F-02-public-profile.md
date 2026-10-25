# F-02 · Hồ sơ công khai: username, tên hiển thị, giới thiệu, ảnh đại diện

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | — |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Mỗi tài khoản có một hồ sơ công khai để người khác tìm và theo dõi. Email và mọi dữ liệu tài khoản khác không bao giờ lộ ra.

## Phạm vi

**Trong phạm vi:**
- Bảng `profiles`.
- API `GET /profiles/{username}`, `GET /me/profile`, `PUT /me/profile`, ảnh đại diện người dùng (`USER_AVATAR`).
- **Nickname khi đăng ký:** form đăng ký có thêm ô "Nickname" (bắt buộc); lưu `users.nickname` (1–50 ký tự sau trim). Tài khoản cũ chưa có nickname → hỏi một lần khi đăng nhập.
- Màn "Tạo hồ sơ" lần đầu vào Bản tin.
- Màn sửa hồ sơ trong Cài đặt.

**Ngoài phạm vi:** lưới bài đăng trên hồ sơ (F-06), nút theo dõi và số người theo dõi (F-07).

## Chi tiết kỹ thuật

**Bảng (mô-đun mới `social`, migration `…_social_profiles`):**

```sql
CREATE TABLE profiles (
  user_id      uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username     citext NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._]{3,30}$'),
  display_name varchar(50) NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 50),
  bio          varchar(150) NULL,
  avatar_key   text NULL,
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL
);
```

- **Quy tắc username:** 3–30 ký tự `a–z 0–9 . _`, không bắt đầu/kết thúc bằng `.`, không có `..`. Có danh sách tên cấm (`admin`, `pethealth`, `api`, `settings`, `me`…).
- **Đổi username:** tối đa 1 lần/14 ngày, kiểm bằng cột `username_changed_at`.
- **Phân quyền:** đọc công khai cho người đã đăng nhập; ghi chỉ chủ. Chính sách RLS ở F-03.

**API:**

| Method + Path | Mô tả | Lỗi |
|---|---|---|
| `GET /me/profile` | Hồ sơ của mình; chưa có → `404 PROFILE_NOT_SET` | |
| `PUT /me/profile` | Tạo/sửa `{ username, displayName, bio }` | `409 USERNAME_TAKEN`, `422 USERNAME_INVALID`, `429 USERNAME_CHANGE_TOO_SOON` |
| `GET /profiles/{username}` | `{ username, displayName, bio, avatarThumbUrl, postCount, followerCount, followingCount, isMe, followedByMe }` (các số đếm điền ở F-06/F-07) | `404` |
| `GET /profiles/check?username=` | `{ available: boolean }` cho ô nhập (debounce 400 ms) | rate limit 30/phút |
| `PUT /me/avatar` | Ảnh đại diện người dùng: dùng lại pipeline ảnh, `targetKind = USER_AVATAR`, khóa `u/{userId}/profile/avatar/{id}.jpg` | như avatar thú cưng |

**Giao diện:**
- Mục **"Bản tin"** mới trên thanh điều hướng (icon `images`).
- Lần đầu mở mà chưa có hồ sơ → màn **"Tạo hồ sơ"**: ảnh đại diện, tên hiển thị (điền sẵn bằng **nickname** lúc đăng ký, sửa được), username (kiểm trùng trực tiếp, hiện ✓/✗), giới thiệu.
- **Cài đặt → Hồ sơ công khai:** sửa các trường trên.
- **Hồ sơ người khác** `/u/{username}`: avatar, tên, username, giới thiệu (lưới bài ở F-06).

## Tiêu chí chấp nhận

- [ ] Đăng ký bắt buộc nhập nickname 1–50 ký tự; trống hoặc chỉ khoảng trắng → lỗi dưới trường. Nickname hiện ở menu tài khoản và điền sẵn tên hiển thị khi tạo hồ sơ.
- [ ] Tạo hồ sơ với username hợp lệ → mở được `/u/{username}` từ tài khoản khác; không có email hay dữ liệu sức khỏe trong phản hồi.
- [ ] Username trùng (không phân biệt hoa thường) → `409`; sai quy tắc hoặc tên cấm → `422`.
- [ ] Đổi username lần 2 trong 14 ngày → `429` kèm số ngày còn lại.
- [ ] Xóa tài khoản → hồ sơ và ảnh đại diện biến mất; `/u/{username}` → `404`.

## Kiểm thử

- **Unit:** quy tắc username (biên 2/3/30/31 ký tự, `.` đầu/cuối, `..`, tên cấm, chữ hoa → chữ thường).
- **IDOR:** `PUT /me/profile` chỉ sửa hồ sơ của phiên; body chèn `userId` bị từ chối (Zod `strict`).
- **E2E:** tạo hồ sơ → tài khoản thứ hai mở được hồ sơ.
