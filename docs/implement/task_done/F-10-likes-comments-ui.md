# F-10 · Giao diện thả tim, bình luận — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-10](../tasks-feed/F-10-likes-comments-ui.md) |
| Trạng thái | Xong, E2E giao diện (phone + tablet) + axe Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### Tim

- **Hook `useToggleLike(postId)`:**
  - Đổi ngay mọi cache chứa bài (bản tin, chi tiết bài).
  - `scope` theo bài nên bấm nhanh nhiều lần thì gửi tuần tự; kết quả server ghi đè số tim.
  - Lỗi → hoàn lại + toast "Không lưu được".
- **Hàng `LikeBar` dưới ảnh:**
  - Nút ♥ có `aria-pressed` và nhãn "Thích, 12 lượt thích" / "Bỏ thích, …"; tim đỏ khi đã thích.
  - Nút 💬 mở bình luận.
  - "N lượt thích" chạm được → danh sách người thích (có nút Theo dõi).
- **Nhấn đúp ảnh** (chuột hoặc chạm đúp): chỉ *thả* tim, không bỏ. Tim trắng lớn bật lên 600 ms (`ph-heart-pop`, chỉ chạy khi không bật giảm chuyển động).

### Bình luận

- **`CommentsPanel`:**
  - Danh sách cũ trước, "Xem thêm bình luận".
  - Ô nhập dưới cùng: Enter gửi, Shift+Enter xuống dòng; khi còn ≤ 50 ký tự thì hiện "Còn N ký tự".
  - Mất mạng → nút gửi tắt (Button chung của S6-03), nội dung ô nhập giữ nguyên.
- **Gửi:** bình luận hiện ngay (mờ) tới khi có phản hồi. Lỗi → chữ đỏ "Chưa gửi được" + "Thử lại", dùng cùng Idempotency-Key nên không tạo bình luận trùng.
- **Xóa:** menu "⋯" trên bình luận (người viết hoặc chủ bài) → `ConfirmDialog`.
- **Chỗ hiện bình luận:**
  - Chi tiết bài: khối bình luận ngay dưới chú thích (`id="comments"`, thông báo COMMENT cuộn tới đây).
  - Bản tin: nút 💬 hoặc "Xem N bình luận" mở sheet bình luận, ô nhập được focus sẵn.
- **Thời gian tương đối:** dùng `formatRelative` (F-06).

### Khác thiết kế

- Chưa có vuốt trái để xóa bình luận trên phone. Xóa qua menu "⋯" (tiêu chí cho phép một trong hai).

## Tiêu chí chấp nhận

- **E2E** `e2e/ui/social-engagement.ui.spec.ts` (phone + tablet):
  - A nhấn đúp ảnh bài của B → nút thành "Bỏ thích, 1 lượt thích"; nhấn đúp lần nữa vẫn thích.
  - A gõ bình luận + Enter → bình luận hiện, ô nhập trống.
  - B mở tab Hoạt động thấy "… đã thích bài của bạn" và "… đã bình luận:".
  - B mở bài thấy 1 lượt thích, xóa bình luận của A qua menu → bình luận biến mất.
- **Trợ năng:** axe 0 lỗi serious/critical trên chi tiết bài (có khối bình luận) và tab Hoạt động; phone mọi nút ≥ 44 px.
- **Toàn bộ test:**
  - E2E 69/69 Pass.
  - Unit 207 Pass.
  - IDOR 132/132 Pass.
