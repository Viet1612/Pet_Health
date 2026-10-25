# F-09 · API thả tim và bình luận

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-04](F-04-posts-api.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Thả / bỏ tim idempotent; bình luận một cấp, xóa được bình luận của mình (chủ bài xóa được mọi bình luận trên bài mình).

## Phạm vi

**Trong phạm vi:**
- `PUT /posts/{id}/like`, `DELETE /posts/{id}/like`.
- `GET /posts/{id}/likes` (danh sách người thả tim).
- `GET /posts/{id}/comments?cursor=`, `POST /posts/{id}/comments`, `DELETE /comments/{id}`.

**Ngoài phạm vi:** trả lời lồng nhau, tim bình luận, sửa bình luận, nhắc tên `@` có thông báo.

## Chi tiết kỹ thuật

1. **Tim:**
   - `PUT` / `DELETE` idempotent (`ON CONFLICT DO NOTHING` / xóa nếu có); trả `{ liked, likeCount }`.
   - Trigger cập nhật `posts.like_count`.
   - Rate limit 300/giờ.
2. **Bình luận:**
   - `body` 1–500 ký tự sau trim, NFC; trả `CommentView { id, author, body, createdAt, canDelete }`.
   - Sắp cũ trước (như cuộc trò chuyện), 20/trang.
   - `POST` cần `Idempotency-Key`; rate limit 30 bình luận/10 phút/tài khoản → `429 COMMENT_RATE_LIMITED`.
   - **Xóa:** chủ bình luận hoặc chủ bài (RLS F-03); xóa thật, giảm `comment_count`.
   - Bình luận có `hidden_at` (F-12) chỉ chủ bình luận thấy.
3. **Sự kiện:** phát `PostLiked`, `PostCommented`, `UserFollowed` qua `SyncEventBus` trong cùng transaction để F-11 tạo thông báo.
4. **Analytics** (danh sách trắng S6-05): `post_liked`, `post_commented` (`{ length_bucket: 'short'|'medium'|'long' }`), không gửi nội dung.

## Tiêu chí chấp nhận

- [ ] 10 request `PUT like` song song từ một tài khoản → đúng 1 dòng, `like_count` tăng 1.
- [ ] B bình luận bài A; A xóa được bình luận của B; C không xóa được (`404`).
- [ ] Bình luận rỗng hoặc chỉ khoảng trắng → `422`; 501 ký tự → `422` kèm `params.max`.
- [ ] Bình luận thứ 31 trong 10 phút → `429`.

## Kiểm thử

- **Unit:** kiểm body bình luận.
- **Integration:** đếm trigger khi tim/bỏ tim/xóa bài song song.
- **IDOR:** fixture `/comments/:id`, `/posts/:id/like`.
