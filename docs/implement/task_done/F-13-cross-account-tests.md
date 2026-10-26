# F-13 · Test chéo tài khoản, E2E, vi/en, analytics — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-13](../tasks-feed/F-13-cross-account-tests.md) |
| Trạng thái | Xong trên máy dev; phần R2 chờ F-01 (production) |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### 1. IDOR / RLS

- **Fixture cho mọi route ghi có ID:**
  - `/posts/:id`, `/post-photos/:id`, `/comments/:id` có fixture; B gọi bằng ID của A → 404, dữ liệu A không đổi.
  - Các route theo username, cùng tim / bình luận trên bài công khai, được miễn kiểm có lý do: chỉ ghi dòng của chính người gọi.
- **Ca quét rò rỉ (`leak.idor.ts`):**
  - Dữ liệu dựng sẵn: A có thú cưng với giống / ngày sinh "bí mật", lần khám có triệu chứng / chẩn đoán / đơn thuốc, cân nặng, ảnh khám. A có bài gắn bé, có ảnh; B theo dõi, tim, bình luận.
  - Phiên B gọi 9 route đọc: hồ sơ, lưới, người theo dõi, đang theo dõi, bài, người thích, bình luận, bản tin, tìm kiếm.
  - Quét JSON: không có email, không có giá trị bí mật nào, không có trường `email` / `birthDate` / `breed` / `weight` / `symptoms` / `diagnosis` / `prescription` / `note` / `storage_key` / `owner_id`.
  - Mọi khóa tệp trong URL ảnh chỉ là `posts/` hoặc `profile/avatar/`.
  - Bài vẫn hiện đúng tên bé.
- **Meta-test RLS:** bảng sức khỏe vẫn `owner_isolation`; 8 bảng social bật RLS + FORCE.
- **Kết quả:** IDOR 136/136 Pass.

### 2. E2E

- **`e2e/api/social-cross.api.spec.ts`** chạy đủ 6 bước với 3 tài khoản:
  1. A đăng bài 2 ảnh gắn Mochi + bài 1 ảnh không gắn.
  2. B tìm A → theo dõi → bản tin có 2 bài → B tim, C tim, B bình luận.
  3. A thấy tim gộp 2 người, xóa bình luận của B.
  4. C chặn A → tìm không ra, mở bài A → 404.
  5. A xóa bài → URL ảnh trả 404 sau khi job purge chạy; bản tin của B không còn bài.
  6. A xóa tài khoản → hồ sơ A 404; "đang theo dõi" của B từ 1 về 0.
- **Phần giao diện** chia theo luồng, mỗi spec chạy cả phone 390 + tablet 834:
  - `social-posts`: đăng, lưới, chi tiết, sửa, xóa.
  - `social-feed`: tìm, theo dõi, bản tin.
  - `social-engagement`: nhấn đúp tim, bình luận, tab Hoạt động, xóa bình luận.
  - `social-block`: chặn, bỏ chặn.
- **Không flaky:**
  - 5 spec bản tin chạy `--repeat-each 2`. Lần đầu lộ ra lỗi toast "Bỏ chặn" (đã sửa, xem F-12).
  - Sau khi sửa, `social-block` chạy 3 lần liên tiếp Pass.
- **Toàn bộ E2E:** 72/72 Pass.
- **axe:** 0 lỗi serious/critical trên `/feed`, `/feed/new`, `/u/{username}`, `/p/{id}`, `/search`, `/u/{username}/followers`, tab Hoạt động.

### 3. i18n

- Mọi chuỗi mới có ở cả `vi.ts` và `en.ts`; kiểu `Messages` bắt thiếu khóa lúc typecheck.
- Mã lỗi mới có câu tiếng Anh trong `en.apiErrors`:
  - Lỗi chung: `PROFILE_NOT_SET`, `USERNAME_TAKEN`, `USERNAME_CHANGE_TOO_SOON`, `POST_LIMIT_REACHED`, `POST_ALREADY_PUBLISHED`, `PHOTO_POSITION_TAKEN`, `LAST_PHOTO`, `FOLLOW_LIMIT_REACHED`, `COMMENT_RATE_LIMITED`, `LIKE_RATE_LIMITED`, `BLOCK_LIMIT_REACHED`.
  - Lỗi trường: `USERNAME_INVALID`, `USERNAME_RESERVED`, `PET_NOT_OWNED`, `CANNOT_FOLLOW_SELF`, `CANNOT_BLOCK_SELF`.
- Không còn chuỗi tiếng Việt viết cứng trong component bản tin (đã quét).
- Thời gian tương đối dùng `Intl.RelativeTimeFormat` theo ngôn ngữ đang chọn.

### 4. Analytics

- **Event mới** (đã thêm vào danh sách trắng):
  - `profile_created`
  - `post_created { photo_count, has_caption, pet_count }`
  - `post_liked`
  - `post_like_received` (ghi cho chủ bài)
  - `post_commented { length_bucket }`
  - `user_followed`
  - `user_blocked`
  - `feed_viewed { items_seen_bucket }` (client, gửi khi rời bản tin)
- `screen` có thêm `feed`, `composer`, `social_profile`, `post_detail`, `search`.
- **View `analytics_funnel_social`:** tạo hồ sơ → đăng bài đầu → nhận tim đầu → theo dõi ≥ 3 người (migration `202610261510`).
- **E2E `social-cross`** quét `analytics_events.props` của các event bản tin: không có chuỗi chứa `@`, chỉ có khóa trong danh sách trắng.

## Ghi chú vận hành

- **Kho ảnh:**
  - Trên máy dev, ảnh bài nằm ở `MEDIA_ROOT/u/{user}/posts/{post}/`: ảnh 1080 px khoảng 150–400 KB + thumbnail 360 px.
  - **R2 (F-01) chưa làm:** làm cùng đợt triển khai production. Khi có R2, xem dung lượng ở Cloudflare Dashboard → R2 → bucket → Metrics. Gói miễn phí có 10 GB lưu trữ, 1 triệu thao tác ghi và 10 triệu thao tác đọc mỗi tháng.
- **Không có chức năng báo cáo (D2).** Nếu cần gỡ tay một bài vi phạm, chạy bằng role chủ DB (`ph_owner`/superuser), rồi gửi job xóa thư mục ảnh:

  ```sql
  -- Xem bài và chủ bài
  SELECT p.id, p.owner_id, pr.username, p.caption FROM posts p
  JOIN profiles pr ON pr.user_id = p.owner_id WHERE p.id = '<post-id>';
  -- Xóa bài (ảnh, tim, bình luận, thông báo xóa theo CASCADE)
  DELETE FROM posts WHERE id = '<post-id>';
  ```

  Sau đó xóa tệp: `pnpm --filter @ph/api exec tsx --env-file=.env -e "..."` gửi job `media.purge-prefix` với prefix `u/<owner-id>/posts/<post-id>/`. Cách đơn giản hơn là xóa thư mục đó trên kho (đĩa dev / R2). Nếu bỏ sót, bước `incoming_orphans` không dọn tệp này, nên phải xóa tay.
- **Bảo trì hằng đêm** có thêm 2 bước:
  - `post_drafts`: xóa bài nháp quá 24 giờ.
  - `social_notifications`: xóa thông báo hoạt động quá 90 ngày.

## Chưa làm / ngoài phạm vi

- **F-01 (R2):** làm khi triển khai production.
- **Load test:** theo S7-03, khi có server.
