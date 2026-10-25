# F-10 · Giao diện thả tim (nhấn đúp), bình luận

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-06](F-06-profile-grid-post-detail.md), [F-09](F-09-likes-comments-api.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Thả tim tức thì (nút ♥ hoặc nhấn đúp vào ảnh), xem và viết bình luận ngay dưới bài, như Instagram.

## Phạm vi

**Trong phạm vi:** nút tim + nhấn đúp có hiệu ứng; số tim chạm được → danh sách người thả tim; khối bình luận ở chi tiết bài; sheet bình luận từ bản tin; ô nhập bình luận; xóa bình luận.

**Ngoài phạm vi:** emoji picker, nhắc tên có gợi ý.

## Chi tiết kỹ thuật

1. **Tim:**
   - `useToggleLike(postId)` cập nhật lạc quan mọi cache chứa bài (bản tin, chi tiết, lưới), `scope` theo bài để gửi tuần tự (giống `useToggleRoutine`).
   - Lỗi → hoàn lại + toast "Không lưu được".
   - **Nhấn đúp ảnh:** chỉ *thả* tim (không bỏ), hiện tim lớn 600 ms giữa ảnh (tắt khi giảm chuyển động).
   - Nút ♥ có `aria-pressed`, nhãn "Thích" / "Bỏ thích".
2. **Bình luận:**
   - Chi tiết bài: danh sách + ô nhập cố định dưới (phone) hoặc cuối cột phải (≥ 1024 px).
   - Từ bản tin: "Xem N bình luận" mở sheet.
   - Gửi: thêm lạc quan vào cuối danh sách (mờ cho tới khi có phản hồi), lỗi → đánh dấu đỏ + "Thử lại".
   - `Enter` gửi, `Shift+Enter` xuống dòng; đếm ký tự khi còn ≤ 50.
   - Xóa: vuốt trái (phone) hoặc menu "⋯" → `ConfirmDialog`.
3. **Thời gian tương đối** ("vừa xong", "5 phút", "2 giờ", "3 ngày", sau 7 ngày hiện ngày) theo `Intl.RelativeTimeFormat` vi/en.

## Tiêu chí chấp nhận

- [ ] Nhấn đúp ảnh → tim đỏ ngay, số tim +1; nhấn đúp lần nữa không bỏ tim.
- [ ] Chạm ♥ 3 lần nhanh → trạng thái cuối đúng, server khớp sau khi tải lại.
- [ ] Gửi bình luận khi mất mạng → nút gửi tắt (S6-03), nội dung ô nhập giữ nguyên.
- [ ] Trình đọc màn hình đọc nút tim "Thích, 12 lượt thích"; mọi nút ≥ 44 px.

## Kiểm thử

- **E2E:** A thích + bình luận bài B; B thấy số tim, bình luận; B xóa bình luận của A.
- **axe:** chi tiết bài có bình luận, sheet bình luận.
