# F-13 · Test chéo tài khoản (IDOR/RLS), E2E, vi/en, analytics

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | F-01 → F-12 |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Chứng minh bản tin không làm lộ dữ liệu riêng (đặc biệt dữ liệu sức khỏe), hoạt động đủ luồng trên 2 khổ màn hình, đủ 2 ngôn ngữ, và có số liệu để đánh giá tính năng.

## Phạm vi

**Trong phạm vi:** mở rộng IDOR suite cho bảng đọc công khai; E2E nhiều tài khoản; rà i18n; event analytics + view funnel; ghi chú vận hành.

**Ngoài phạm vi:** load test lớn (theo S7-03 khi có server).

## Chi tiết kỹ thuật

1. **IDOR / RLS:**
   - Mọi route ghi của `social` có fixture: B gọi bằng ID của A → `404`, snapshot dữ liệu A không đổi.
   - **Ca rò rỉ:** dùng phiên B gọi mọi route đọc xã hội của A, quét toàn bộ JSON phản hồi; **không** được chứa:
     - Email, `birth_date`, `breed`, `weight`.
     - `symptoms`, `diagnosis`, `prescription`, `note` của mốc.
     - Bất kỳ `storage_key` nào ngoài khóa `posts/` và avatar.
   - Meta-test (F-03): bảng sức khỏe vẫn `owner_isolation`.
2. **E2E (phone 390 + tablet 834), 3 tài khoản A, B, C:**
   1. A tạo hồ sơ, đăng bài 2 ảnh gắn "Mochi".
   2. B tìm A → theo dõi → thấy bài trên bản tin → thả tim, bình luận.
   3. A thấy thông báo hoạt động gộp; A xóa bình luận của B.
   4. C chặn A → C không thấy A ở tìm kiếm.
   5. A xóa bài → ảnh bị xóa trên kho; B làm mới không còn bài.
   6. A xóa tài khoản → hồ sơ `404`; số người theo dõi của người khác cập nhật.
3. **i18n:** mọi chuỗi mới có trong `vi.ts` và `en.ts` (typecheck `Messages`); mã lỗi mới (`USERNAME_TAKEN`, `POST_LIMIT_REACHED`, `COMMENT_RATE_LIMITED`, `PET_NOT_OWNED`…) có câu tiếng Anh trong `en.apiErrors`; thời gian tương đối đúng theo ngôn ngữ.
4. **Analytics** (thêm vào danh sách trắng S6-05):
   - Event: `profile_created`, `post_created` (`{ photo_count, has_caption, pet_count }`), `post_liked`, `post_commented`, `user_followed`, `feed_viewed` (`{ items_seen_bucket }`), `user_blocked`, `content_reported` (`{ reason }`).
   - View `analytics_funnel_social`: tạo hồ sơ → đăng bài đầu → nhận tim đầu → theo dõi ≥ 3 người.
5. **Ghi chú vận hành** (`docs/implement/task_done/F-13…`):
   - Cách dùng script kiểm duyệt.
   - Giới hạn R2 và cách xem dung lượng.
   - Quy trình xử lý khi có báo cáo nội dung xấu.

## Tiêu chí chấp nhận

- [ ] IDOR suite xanh, gồm ca quét rò rỉ trường sức khỏe.
- [ ] E2E 6 bước Pass ở 2 viewport, không flaky 3 lần liên tiếp.
- [ ] axe 0 lỗi serious/critical trên `/feed`, `/feed/new`, `/u/{username}`, `/p/{id}`, tìm kiếm, tab Hoạt động.
- [ ] Đổi sang English: toàn bộ màn bản tin là tiếng Anh, kể cả lỗi và thời gian tương đối.
- [ ] Sau E2E, quét `analytics_events.props` không có chuỗi chứa `@` hay khóa ngoài danh sách trắng.

## Kiểm thử

Như phần chi tiết; chạy cùng bộ `pnpm e2e` và IDOR hiện có.
