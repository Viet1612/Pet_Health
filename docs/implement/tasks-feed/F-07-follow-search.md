# F-07 · Theo dõi / bỏ theo dõi, danh sách, tìm theo username

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-03](F-03-social-schema.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Người dùng tìm người khác theo username hoặc tên, theo dõi ngay (không cần duyệt), bỏ theo dõi, xem danh sách người theo dõi / đang theo dõi.

## Phạm vi

**Trong phạm vi:**
- `PUT /follows/{username}`, `DELETE /follows/{username}`.
- `GET /profiles/{username}/followers`, `GET /profiles/{username}/following`.
- `GET /search/profiles?q=`.
- Nút Theo dõi trên hồ sơ; màn Tìm kiếm.

**Ngoài phạm vi:** gợi ý "người bạn có thể biết", tài khoản riêng tư cần duyệt.

## Chi tiết kỹ thuật

1. **Theo dõi:**
   - `PUT` idempotent (`ON CONFLICT DO NOTHING`), `DELETE` idempotent; trả `{ following: boolean, followerCount }`.
   - Tự theo dõi chính mình → `422`.
   - Đã chặn nhau (F-12) → `404`.
   - Giới hạn 200 lần theo dõi/ngày/tài khoản → `429`.
2. **Danh sách:** keyset theo `created_at DESC`, 30 người/trang; mỗi dòng `{ username, displayName, avatarThumbUrl, followedByMe }`.
3. **Tìm kiếm:**
   - `q` 1–30 ký tự, chuẩn hóa không dấu.
   - Khớp tiền tố username hoặc chuỗi con trong `display_name` (extension `pg_trgm`, index GIN trên `unaccent(lower(display_name))`).
   - Sắp: username khớp chính xác trước, rồi theo `follower_count`. Tối đa 20 kết quả.
   - Rate limit 60/phút.
4. **Giao diện:**
   - Nút trên hồ sơ "Theo dõi" (primary) / "Đang theo dõi" (secondary, chạm → menu "Bỏ theo dõi").
   - Cập nhật lạc quan, lỗi thì hoàn lại + toast.
   - Màn **Tìm kiếm** (icon kính lúp trên Bản tin): ô tìm debounce 300 ms, kết quả có nút Theo dõi tại chỗ.
   - Chạm số "Người theo dõi" / "Đang theo dõi" → danh sách.

## Tiêu chí chấp nhận

- [ ] A theo dõi B → số người theo dõi của B +1 ngay (lạc quan), bài của B vào bản tin của A (F-08).
- [ ] Bấm Theo dõi 2 lần nhanh chỉ tạo 1 dòng; bỏ theo dõi 2 lần không lỗi.
- [ ] Tìm "mochi" ra `@mochi.cute` và người tên hiển thị "Mèo Mochi"; tìm "hồ" khớp "Ho".
- [ ] Email không bao giờ tìm được và không xuất hiện trong kết quả.

## Kiểm thử

- **Integration:** đếm `follower_count` sau theo dõi/bỏ theo dõi song song (10 request) khớp `count(*)`.
- **E2E:** tìm → theo dõi → hồ sơ hiển thị "Đang theo dõi".
