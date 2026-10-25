# F-12 · Chặn người dùng và giới hạn chống spam

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-08](F-08-feed.md), [F-09](F-09-likes-comments-api.md) |
| Ước lượng | 1 ngày |

## Mục tiêu

Người dùng tự bảo vệ mình bằng cách chặn người khác; spam bị chặn ở tầng ứng dụng. **Không có chức năng báo cáo nội dung** (D2): không có báo cáo, tự ẩn bài hay trang/script kiểm duyệt.

## Phạm vi

**Trong phạm vi:** `PUT/DELETE /blocks/{username}`, `GET /me/blocks`; mục "Đã chặn" trong Cài đặt; rà và thống nhất mọi rate limit của bản tin.

**Ngoài phạm vi:** báo cáo nội dung, tự ẩn, kiểm duyệt (bỏ theo quyết định D2); lọc ảnh tự động.

## Chi tiết kỹ thuật

1. **Chặn:**
   - Chặn → trong cùng transaction xóa `follows` hai chiều, xóa tim và bình luận của người bị chặn trên bài của mình, xóa thông báo liên quan.
   - Sau đó RLS (F-03) ẩn mọi nội dung hai chiều: bài, hồ sơ, bình luận, kết quả tìm kiếm.
   - Người bị chặn **không** nhận thông báo; mở hồ sơ người chặn → `404` (như không tồn tại).
   - Bỏ chặn không khôi phục follow, tim, bình luận đã xóa.
2. **Rate limit** (`rate_limits`, trả `429` + `retryAfter`, client hiện "Bạn thao tác quá nhanh, thử lại sau N phút"):

   | Hành động | Ngưỡng |
   |---|---|
   | Đăng bài | 30/ngày |
   | Bình luận | 30/10 phút |
   | Thích | 300/giờ |
   | Theo dõi | 200/ngày |
   | Chặn | 50/ngày |
   | Tìm kiếm | 60/phút |

3. **Tài khoản mới** (< 24 h tuổi): ngưỡng đăng bài và bình luận giảm còn 1/3.

## Giao diện

- Menu "⋯" trên bài, bình luận, hồ sơ người khác: "Chặn @username".
- Chặn: `ConfirmDialog` "Chặn @x? Họ sẽ không thấy bài và hồ sơ của bạn, và bạn cũng không thấy của họ."
- **Cài đặt → Đã chặn:** danh sách, nút "Bỏ chặn".

## Tiêu chí chấp nhận

- [ ] A chặn B → B không thấy hồ sơ, bài, bình luận của A ở bản tin, tìm kiếm, chi tiết bài; follow hai chiều bị xóa.
- [ ] B không theo dõi, thích, bình luận được bài của A (`404`).
- [ ] A bỏ chặn → hai bên thấy lại nhau; follow không tự khôi phục.
- [ ] Vượt mỗi ngưỡng ở bảng trên → `429` đúng `retryAfter`.

## Kiểm thử

- **Integration:** chặn rồi kiểm từng truy vấn đọc (bản tin, hồ sơ, tìm kiếm, bình luận, thông báo) dưới cả hai phiên.
- **E2E:** A chặn B → B tìm A không ra; A bỏ chặn → B tìm lại được.
