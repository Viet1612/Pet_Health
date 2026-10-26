# F-12 · Chặn người dùng và giới hạn chống spam — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-12](../tasks-feed/F-12-safety.md) |
| Trạng thái | Xong, E2E API + giao diện + test tích hợp Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

> **Cập nhật 2026-10-26 (theo yêu cầu chủ dự án):**
> - **Tìm kiếm:** người chặn **vẫn tìm thấy** người bị chặn, kèm nút "Bỏ chặn" (`blockedByMe`). Chiều ngược lại vẫn ẩn.
> - **Tim và bình luận:** khi chặn, tim và bình luận của người bị chặn trên bài người chặn được **ẩn** (cột `hidden_by_block`, migration `202610261600_block_soft_hide`) thay vì xóa. Phần ẩn không ai thấy, kể cả người thứ ba, và không tính vào số đếm. Bỏ chặn thì hiện lại.
> - Theo dõi hai chiều và thông báo vẫn bị xóa như trước.
>
> Các mục bên dưới mô tả bản đầu; chỗ nào khác thì theo ghi chú này.

### Chặn

- **`PUT /blocks/{username}` (idempotent):** trong cùng transaction, **trước khi** ghi dòng chặn:
  - Xóa follow hai chiều.
  - Xóa tim và bình luận của người bị chặn trên bài của mình.
  - Xóa thông báo hoạt động hai chiều.
- **Lỗi và giới hạn:** tự chặn → `422 CANNOT_BLOCK_SELF`; tối đa 50 lần/ngày → `429 BLOCK_LIMIT_REACHED`.
- **`DELETE /blocks/{username}`:** bỏ chặn, không khôi phục follow, tim, bình luận đã xóa.
- **`GET /me/blocks`:** danh sách người mình đã chặn.
- **Migration `202610261500_social_blocks`:**
  - **`follows`:** người được theo dõi cũng xóa được dòng theo dõi mình.
  - **`post_likes`:** chủ bài gỡ được tim trên bài mình.
  - **`profiles`:** người chặn vẫn thấy hồ sơ người mình chặn, để bấm "Bỏ chặn". Bài, bình luận, bản tin, danh sách theo dõi vẫn ẩn hai chiều qua `not_blocked`. Người bị chặn mở hồ sơ người chặn → 404.
- **Tìm kiếm:** loại cả người mình đã chặn.
- **`ProfileView`:** có thêm `blockedByMe`.
- **Không có báo cáo nội dung (D2):** không có báo cáo, tự ẩn bài hay kiểm duyệt.

### Giới hạn chống spam

Mọi ngưỡng gom về `social/application/limits.ts` (`SOCIAL_LIMITS` + `socialLimit`):

| Hành động | Ngưỡng | Mã 429 |
|---|---|---|
| Đăng bài | 30/ngày (tài khoản < 24 h: 10) | `POST_LIMIT_REACHED` |
| Bình luận | 30/10 phút (tài khoản < 24 h: 10) | `COMMENT_RATE_LIMITED` |
| Thích | 300/giờ | `LIKE_RATE_LIMITED` |
| Theo dõi | 200/ngày | `FOLLOW_LIMIT_REACHED` |
| Chặn | 50/ngày | `BLOCK_LIMIT_REACHED` |
| Tìm kiếm | 60/phút | `RATE_LIMITED` |

- Mọi lỗi 429 đều có `retryAfter` + `params.max`.
- **Tuổi tài khoản:** thông tin phiên (`AuthContext.accountCreatedAt`, lấy từ `users.created_at`) có thêm thời điểm tạo tài khoản để tính tài khoản mới.
- **Client:** 5 mã giới hạn của bản tin hiện chung một câu "Bạn thao tác quá nhanh, thử lại sau N phút" (`to-user-message.ts`).

### Web

- **Menu "⋯" → "Chặn @username"** có ở:
  - Hồ sơ người khác.
  - Chi tiết bài của người khác: chặn xong thì về Bản tin.
  - Bình luận của người khác, cùng menu với mục "Xóa" nếu có.
- **Xác nhận:** `ConfirmDialog` "Chặn @x? Họ sẽ không thấy bài và hồ sơ của bạn…".
- **Hồ sơ người mình đã chặn:** hiện "Bạn đã chặn người này. Bài của họ bị ẩn." + nút **Bỏ chặn**; lưới bài bị ẩn.
- **Cài đặt → Tài khoản → Đã chặn:** danh sách + nút **Bỏ chặn**.
- **Lỗi E2E tìm thấy (đã sửa):** bỏ chặn trong danh sách có lúc không hiện toast. Danh sách làm mới gỡ nút khỏi màn trước khi callback `mutate` chạy. Đã đổi sang `mutateAsync`.

## Tiêu chí chấp nhận

- **Test tích hợp** (`social-feed.int.test.ts`):
  - B chặn C → follow hai chiều, tim + bình luận của C trên bài B bị xóa dưới RLS.
  - C không thấy hồ sơ, bài của B và tìm không ra B. B thấy hồ sơ C nhưng tìm không ra C.
  - Bỏ chặn → C tìm lại được B; follow không tự khôi phục.
- **Unit:** tài khoản < 24 h: đăng bài / bình luận còn 10; thích giữ 300; tài khoản ≥ 24 h ngưỡng đầy đủ.
- **E2E giao diện (phone + tablet):** C chặn A từ hồ sơ → tìm A không ra → Cài đặt → Đã chặn → Bỏ chặn → tìm lại được. Chạy 3 lần liên tiếp, Pass cả 3.
- **E2E API** (`social-cross`): C chặn A → tìm không ra; mở bài của A → 404; A mở hồ sơ C → 404.
- **Chưa kiểm tự động:** vượt từng ngưỡng → 429. Đã có unit cho `limitFor`; bộ đếm dùng rate limiter chung (S0-05).
