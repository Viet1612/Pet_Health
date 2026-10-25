# F-12 · Chặn người dùng, báo cáo bài, tự ẩn, giới hạn chống spam

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-08](F-08-feed.md), [F-09](F-09-likes-comments-api.md) |
| Ước lượng | 2 ngày |

## Mục tiêu

Người dùng tự bảo vệ mình (chặn, báo cáo); nội dung bị nhiều người báo cáo tự ẩn; spam bị chặn ở tầng ứng dụng.

## Phạm vi

**Trong phạm vi:**
- `PUT/DELETE /blocks/{username}`, `GET /me/blocks`.
- `POST /posts/{id}/report`, `POST /comments/{id}/report`.
- Tự ẩn khi đủ ngưỡng; script quản trị.
- Rà và thống nhất mọi rate limit của bản tin.

**Ngoài phạm vi:** trang quản trị web, lọc ảnh tự động bằng AI (để sau).

## Chi tiết kỹ thuật

1. **Chặn:**
   - Chặn → trong cùng transaction xóa `follows` hai chiều, xóa tim và bình luận của người bị chặn trên bài của mình, xóa thông báo liên quan.
   - Sau đó RLS (F-03) ẩn mọi nội dung hai chiều.
   - Người bị chặn **không** nhận thông báo; mở hồ sơ người chặn → `404` (như không tồn tại).
   - Bỏ chặn không khôi phục follow.
2. **Báo cáo:**
   - Lý do: `SPAM`, `INAPPROPRIATE`, `HARASSMENT`, `NOT_PET`, `OTHER`.
   - Mỗi người báo cáo một bài/bình luận một lần (PK).
   - Báo cáo xong, nội dung đó ẩn ngay **với người báo cáo**.
3. **Tự ẩn (D2):** đủ **3 báo cáo từ 3 tài khoản khác nhau** → `hidden_at = now`. Chủ bài vẫn thấy bài với nhãn "Đã bị ẩn do bị báo cáo" và nhận một thông báo hệ thống.
4. **Script quản trị** `pnpm --filter @ph/api social:moderate`:
   - `list` — nội dung bị ẩn, số báo cáo.
   - `restore <id>` — bỏ ẩn, xóa báo cáo.
   - `delete <id>` — xóa hẳn + purge ảnh.
   - Chạy trên server bằng role chủ; log mọi lệnh.
5. **Rate limit** (`rate_limits`, trả `429` + `retryAfter`, client hiện "Bạn thao tác quá nhanh, thử lại sau N phút"):

   | Hành động | Ngưỡng |
   |---|---|
   | Đăng bài | 30/ngày |
   | Bình luận | 30/10 phút |
   | Thích | 300/giờ |
   | Theo dõi | 200/ngày |
   | Báo cáo | 20/ngày |
   | Tìm kiếm | 60/phút |

6. **Tài khoản mới** (< 24 h tuổi): ngưỡng đăng bài và bình luận giảm còn 1/3.

## Giao diện

- Menu "⋯" trên bài / bình luận / hồ sơ người khác: "Báo cáo", "Chặn @username".
- Báo cáo: sheet chọn lý do → "Đã gửi báo cáo, cảm ơn bạn".
- Chặn: `ConfirmDialog` "Chặn @x? Họ sẽ không thấy bài và hồ sơ của bạn, và bạn cũng không thấy của họ."
- **Cài đặt → Đã chặn:** danh sách, nút "Bỏ chặn".

## Tiêu chí chấp nhận

- [ ] A chặn B → B không thấy hồ sơ, bài, bình luận của A ở bản tin, tìm kiếm, chi tiết bài; follow hai chiều bị xóa.
- [ ] 3 tài khoản khác nhau báo cáo một bài → bài biến khỏi bản tin của mọi người trừ chủ; 1 tài khoản báo cáo 3 lần chỉ tính 1.
- [ ] `restore` khôi phục bài, bài xuất hiện lại.
- [ ] Vượt mỗi ngưỡng ở bảng trên → `429` đúng `retryAfter`.

## Kiểm thử

- **Integration:** chặn rồi kiểm từng truy vấn đọc (bản tin, hồ sơ, tìm kiếm, bình luận, thông báo) dưới cả hai phiên.
- **E2E:** 4 tài khoản, 3 báo cáo → bài ẩn; tài khoản thứ tư không còn thấy.
