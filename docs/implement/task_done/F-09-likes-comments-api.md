# F-09 · API thả tim và bình luận — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-09](../tasks-feed/F-09-likes-comments-api.md) |
| Trạng thái | Xong, E2E API + IDOR + test tích hợp Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### Tim

- `PUT` / `DELETE /posts/{id}/like`: idempotent, trả `{ liked, likeCount }`.
- Chỉ thả tim được bài đã đăng mà mình thấy; bài không có hoặc đã chặn nhau → 404.
- Rate limit 300 lần/giờ → `429 LIKE_RATE_LIMITED`.
- `GET /posts/{id}/likes`: tối đa 100 người thả tim gần nhất, có `followedByMe`.

### Bình luận

- `GET /posts/{id}/comments?cursor=`: cũ trước (như cuộc trò chuyện), 20/trang.
- `POST /posts/{id}/comments` (Idempotency-Key):
  - Nội dung NFC + trim, 1–500 ký tự. Rỗng → `422 REQUIRED`; dài quá → `422 TOO_LONG` kèm `params.max`.
  - Tối đa 30 bình luận/10 phút → `429 COMMENT_RATE_LIMITED`.
  - Trả `CommentView { id, author, body, createdAt, canDelete }`.
- `DELETE /comments/{id}`: người viết hoặc chủ bài được xóa; người khác → 404. Xóa thật; thông báo liên quan xóa theo CASCADE.

### Thông báo và analytics

- Tạo thông báo cho F-11 trong cùng transaction: LIKE (lần đầu), COMMENT, FOLLOW (trong `follow`).
- Analytics `post_liked`, `post_commented { length_bucket }`, đã thêm vào danh sách trắng. Không gửi nội dung bình luận.

### Khác thiết kế

- **Không có trigger `like_count` / `comment_count`:** số tim, số bình luận đếm khi đọc, như đã quyết ở F-03.
- **Không dùng `SyncEventBus`:** tim, bình luận, theo dõi và thông báo cùng nằm trong mô-đun `social`, nên gọi thẳng `activityRepository.add` trong transaction. Event bus chỉ cần khi khác mô-đun.

### IDOR

- Fixture `/comments/:id`.
- Miễn kiểm tim / danh sách tim / bình luận trên bài: đây là bài công khai, và chỉ ghi dòng của chính người gọi (RLS).

## Tiêu chí chấp nhận

- **Test tích hợp:** 10 lần thả tim song song → 1 dòng tim, 1 thông báo. Tự thích bài mình không tạo thông báo.
- **E2E API** `e2e/api/social-engagement.api.spec.ts`:
  - Tim:
    - 10 `PUT like` song song → `likeCount` = 1.
    - Bỏ tim 2 lần không lỗi.
    - Thích lại không thêm thông báo.
  - Bình luận:
    - Kiểm nội dung: rỗng → 422; 501 ký tự → 422 `params.max` = 500.
    - B bình luận; A (chủ bài) xóa được; C → 404.
- **IDOR:** 132/132 Pass.
