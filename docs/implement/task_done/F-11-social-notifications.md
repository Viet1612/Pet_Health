# F-11 · Thông báo thả tim, bình luận, theo dõi — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-11](../tasks-feed/F-11-social-notifications.md) |
| Trạng thái | Xong, E2E API + giao diện + test tích hợp Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### Tạo thông báo

`activityRepository.add` chạy cùng transaction với thao tác. Người ghi là người gây ra (actor), theo RLS `actor_insert`.

- **LIKE:**
  - Người nhận là chủ bài; tự thích bài mình thì bỏ qua.
  - Index unique một phần `(owner, actor, post) WHERE kind='LIKE'` + `ON CONFLICT DO NOTHING`, nên thích lại sau khi bỏ không tạo bản mới.
- **COMMENT:**
  - Mỗi bình luận một bản ghi, có `comment_id`.
  - Xóa bình luận thì thông báo bị xóa theo CASCADE.
- **FOLLOW:**
  - Người nhận là người được theo dõi.
  - Bỏ theo dõi thì xóa thông báo **chưa đọc**; đã đọc thì giữ lại.
- **Người đã chặn nhau:** không tạo được thông báo, vì RLS đã chặn tim, bình luận và theo dõi giữa hai người.

### API

- `GET /social-notifications?cursor=`:
  - Gộp khi đọc: tim **chưa đọc** cùng một bài thành 1 dòng (`actors` ≤ 3 người gần nhất + `actorCount`). Bình luận và theo dõi mỗi cái một dòng.
  - Mỗi dòng có `post { id, thumbUrl }`, `commentExcerpt` (≤ 80 ký tự), `unread`.
  - 30 dòng/trang, mới nhất trước.
- `POST /social-notifications/read-all { upTo? }`: đánh dấu đã xem.
- `GET /notifications/summary` có thêm `socialUnreadCount`:
  - Mô-đun notifications đọc qua `socialQuery.unreadActivityCount`, không đọc bảng trực tiếp.
  - Banner nhắc lịch và số nhắc lịch không đổi.
- `maintenance.daily` có thêm bước `social_notifications`: xóa thông báo hoạt động hơn 90 ngày.

### Web

- **Chuông:**
  - Badge = nhắc lịch + hoạt động.
  - `aria-label` "Thông báo, 3 nhắc lịch, 5 hoạt động mới".
  - Chỉ có hoạt động mới → mở thẳng tab "Hoạt động".
- **Màn `/notifications`:**
  - Segmented 2 tab "Nhắc lịch" (giữ nguyên S4-05) | "Hoạt động". Tab lưu ở `?tab=activity`.
  - Nút "Đánh dấu đã xem" chỉ hiện ở tab Nhắc lịch.
- **Tab Hoạt động (`ActivityList`):**
  - Mỗi dòng: avatar người làm, câu mô tả ("mochi.cute và 5 người khác đã thích bài của bạn" / "… đã bình luận: “…”" / "… đã bắt đầu theo dõi bạn"), thời gian, nhãn "Mới", ảnh thu nhỏ bài ở bên phải.
  - Chạm dòng → chi tiết bài (bình luận thì cuộn tới khối bình luận) hoặc hồ sơ (theo dõi).
  - Mở tab thì đánh dấu đã xem tới dòng mới nhất và làm mới chuông.

## Tiêu chí chấp nhận

- **Test tích hợp:**
  - 10 request tạo thông báo LIKE song song → 1 bản ghi.
  - 3 người thích một bài → 1 dòng gộp, `actor_count` = 3.
  - Người khác không đọc được thông báo của chủ (RLS).
- **E2E API:**
  - B và C thích, B bình luận, C theo dõi → `socialUnreadCount` = 4; danh sách 3 dòng [FOLLOW, COMMENT, LIKE gộp 2 người].
  - `read-all` → 0.
  - Bỏ theo dõi sau khi đã đọc → thông báo theo dõi vẫn còn.
- **E2E giao diện:** B mở tab Hoạt động thấy thông báo tim và bình luận của A.
- **Nhắc lịch:** thông báo hoạt động không hiện ở tab Nhắc lịch; banner Dashboard không đổi (summary chỉ thêm trường mới).
