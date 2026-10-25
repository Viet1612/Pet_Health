# F-06 · Lưới hồ sơ và chi tiết bài — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-06](../tasks-feed/F-06-profile-grid-post-detail.md) |
| Trạng thái | Xong, E2E giao diện + axe Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

- **`/u/{username}`:** phần đầu hồ sơ (F-02) + **`ProfileGrid`**:
  - Lưới 3 cột, khoảng cách 2 px, ô vuông `aspect-square` nên không giật bố cục; ảnh `loading="lazy"`.
  - Bài nhiều ảnh có icon chồng ảnh ở góc.
  - Một hồ sơ chứa mọi bài, không chia theo thú cưng.
  - `useInfiniteQuery` 18 bài/trang; `IntersectionObserver` tự tải trang kế khi cuộn gần cuối.
  - Mỗi ô là link "Mở bài n" tới `/p/{id}`.
- **`/p/{postId}`** (`PostDetailScreen`):
  - **Đầu bài:** avatar + tên + `@username` (link tới hồ sơ), thời gian tương đối qua `Intl.RelativeTimeFormat` ("3 giờ trước" / "3 hours ago"; quá 7 ngày thì hiện ngày tháng). Hàm mới `formatRelative` trong `lib/format.ts`.
  - **`PhotoCarousel`:**
    - Vuốt bằng `scroll-snap-type: x mandatory`, chấm chỉ vị trí.
    - Nút ←/→ ở ≥ 768 px; phím ←/→ khi carousel đang focus.
    - Trình đọc màn hình đọc "Ảnh 2/5" (`aria-roledescription="carousel"` + vùng `aria-live`).
    - Ảnh chưa xử lý hiện "Đang xử lý". URL ký hết hạn → tải lại bài.
  - **Nội dung:** chip tên thú cưng (chỉ khi bài có gắn); chú thích giữ xuống dòng, `@username` thành link.
  - **Menu "⋯" của chủ bài:**
    - **Sửa bài:** sheet chú thích + chọn / bỏ gắn bé → `PATCH`.
    - **Xóa bài:** `ConfirmDialog` → `DELETE` → về hồ sơ, toast "Đã xóa bài".
  - **Bố cục:** có h1 ẩn ("Bài của …"); ≥ 1024 px chia 2 cột (ảnh trái, thông tin phải), tối đa 935 px.
  - **Bài đã xóa hoặc không thấy được:** "Bài này không còn".

## Tiêu chí chấp nhận

- **E2E** `e2e/ui/social-posts.ui.spec.ts` (phone + tablet):
  - B mở hồ sơ A → mở bài 2 ảnh: thấy chip Mochi, không có menu "Tùy chọn bài".
  - Phím → chuyển sang "Ảnh 2/2".
  - A sửa chú thích qua menu → B tải lại thấy chú thích mới.
  - A xóa bài → lưới còn 1 bài; B mở lại link → "Bài này không còn".
- **Trợ năng:** axe 0 lỗi serious/critical trên `/u/{username}` và `/p/{id}`; trên phone mọi nút ≥ 44 px.
- **Toàn bộ test:**
  - E2E 59/59 Pass.
  - Unit 207 Pass.
  - IDOR 116/116 Pass.
- **Chưa kiểm tự động:** hồ sơ 40 bài cuộn tải tiếp (dùng keyset đã kiểm ở API); không cuộn ngang ở 360–1440 px (kiểm bằng mắt).
