# F-06 · Hồ sơ dạng lưới 3 cột và chi tiết bài (vuốt ảnh)

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-04](F-04-posts-api.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Trang hồ sơ hiển thị bài dạng lưới vuông 3 cột như Instagram; chạm một ô mở chi tiết bài, vuốt qua lại giữa các ảnh.

## Phạm vi

**Trong phạm vi:** `/u/{username}` (phần đầu hồ sơ + lưới), `/p/{postId}` (chi tiết bài), carousel ảnh, menu "⋯" của chủ bài (Sửa chú thích, Xóa bài).

**Ngoài phạm vi:** nút Theo dõi (F-07), tim và bình luận (F-10), Báo cáo (F-12).

## Chi tiết kỹ thuật

1. **Phần đầu hồ sơ:**
   - Avatar 80 px, tên hiển thị, `@username`, giới thiệu.
   - 3 số: Bài viết · Người theo dõi · Đang theo dõi (dữ liệu từ `GET /profiles/{username}`).
   - Hồ sơ của mình có nút "Sửa hồ sơ".
2. **Lưới:**
   - `useInfiniteQuery(GET /profiles/{username}/posts)`, 3 cột, khoảng cách 2 px, ô vuông `aspect-square`, ảnh `thumbUrl` `loading="lazy"`.
   - Bài nhiều ảnh có icon chồng ảnh ở góc.
   - Cuộn tới cuối tự tải trang kế.
3. **Chi tiết bài `/p/{id}`:**
   - Đầu bài: avatar + username (link hồ sơ), thời gian tương đối ("3 giờ trước" / "3 hours ago" qua `Intl.RelativeTimeFormat`).
   - Carousel: vuốt (`scroll-snap-type: x mandatory`), chấm chỉ vị trí, nút ←/→ ở ≥ 768 px, phím ←/→.
   - Chú thích (link hóa `@username`), chip tên thú cưng.
4. **Sửa / xóa (chủ bài):**
   - "Sửa" mở sheet chú thích + chọn bé → `PATCH`.
   - "Xóa" → `ConfirmDialog` → `DELETE` → về hồ sơ, toast "Đã xóa bài".
5. **Ảnh đang xử lý / lỗi:** khung xám "Đang xử lý" như ảnh khám.

## Giao diện

- **Phone:** lưới full width; chi tiết bài 1 cột.
- **≥ 1024 px:** chi tiết bài 2 cột (ảnh trái, thông tin và bình luận phải), tối đa 935 px.

## Tiêu chí chấp nhận

- [ ] Hồ sơ có 40 bài: tải 18 bài đầu, cuộn tải tiếp, không giật bố cục (ô có kích thước cố định).
- [ ] Chi tiết bài 5 ảnh: vuốt, phím ←/→, chấm vị trí đúng; trình đọc màn hình đọc "Ảnh 2/5".
- [ ] Người khác không thấy menu Sửa/Xóa; mở `/p/{id}` bài đã xóa → `ErrorState` 404.
- [ ] Không cuộn ngang ở 360–1440 px.

## Kiểm thử

- **E2E:** tài khoản B mở hồ sơ A, mở bài, vuốt ảnh; A sửa chú thích, B tải lại thấy chú thích mới.
- **axe:** `/u/{username}`, `/p/{id}` 0 lỗi serious.
