# F-11 · Thông báo thả tim, bình luận, theo dõi

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-07](F-07-follow-search.md), [F-09](F-09-likes-comments-api.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Người dùng biết khi có người thích, bình luận bài của mình hoặc theo dõi mình. Thông báo xã hội không lấn át nhắc lịch y tế.

## Phạm vi

**Trong phạm vi:**
- Tạo bản ghi `social_notifications` từ sự kiện F-09/F-07.
- `GET /social-notifications`, `POST /social-notifications/read-all`.
- Chuông đếm cả hai loại; màn Thông báo có 2 tab "Nhắc lịch" | "Hoạt động".

**Ngoài phạm vi:** push notification (cần app điện thoại, Phase2-ideas §1), email thông báo xã hội.

## Chi tiết kỹ thuật

1. **Tạo thông báo** (subscriber của `SyncEventBus`, cùng transaction):
   - **LIKE:** người nhận = chủ bài; bỏ qua nếu tự thích bài mình. `UNIQUE (owner_id, actor_id, kind, post_id)` → thích lại sau khi bỏ không tạo bản mới.
   - **COMMENT:** mỗi bình luận một bản ghi (có `comment_id`); xóa bình luận → xóa thông báo.
   - **FOLLOW:** người nhận = người được theo dõi; bỏ theo dõi → xóa thông báo chưa đọc.
   - Bỏ qua nếu hai người đã chặn nhau.
2. **Gộp khi hiển thị:** cùng bài + cùng loại LIKE chưa đọc → một dòng "mochi.cute và 5 người khác đã thích bài của bạn". Gộp ở truy vấn, không gộp lúc ghi.
3. **API:**
   - `GET /social-notifications?cursor=` → `{ items: [{ kind, actors: [≤ 3 profile], actorCount, post?: { id, thumbUrl }, commentExcerpt? (≤ 80 ký tự), unread, createdAt }], nextCursor }`.
   - Mở tab "Hoạt động" → `read-all` theo `upTo`.
4. **Chuông:** `GET /notifications/summary` trả thêm `socialUnreadCount`; badge = tổng; `aria-label` "Thông báo, 3 nhắc lịch, 5 hoạt động mới".
5. **Lưu giữ:** `maintenance.daily` xóa thông báo xã hội > 90 ngày (thêm bước 9 vào S6-06).

## Giao diện

- Màn `/notifications` có segmented "Nhắc lịch" (giữ nguyên S4-05) | "Hoạt động".
- Dòng hoạt động: avatar người làm, câu mô tả, thời gian, ảnh thu nhỏ bài ở phải. Chạm → chi tiết bài (cuộn tới bình luận nếu là COMMENT) hoặc hồ sơ (FOLLOW).

## Tiêu chí chấp nhận

- [ ] B thích bài A → A thấy badge +1 ở lần mở app hoặc đổi màn kế tiếp; tự thích bài mình không tạo thông báo.
- [ ] 6 người thích cùng một bài → 1 dòng gộp "… và 5 người khác".
- [ ] B bỏ thích rồi thích lại → không tạo thêm thông báo.
- [ ] Thông báo hoạt động không xuất hiện ở tab Nhắc lịch, và banner nhắc trên Dashboard không đổi.

## Kiểm thử

- **Integration:** subscriber tạo/xóa đúng bản ghi cho từng sự kiện; ràng buộc unique chặn trùng khi 10 request song song.
- **E2E:** A, B, C; B và C thích bài A, B bình luận, C theo dõi A → A thấy 3 dòng (1 gộp tim).
