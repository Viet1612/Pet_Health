# S2-05 · Xóa thú cưng (API + giao diện) — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S2-05](../tasks/S2-05-delete-pet.md) |
| Trạng thái | Xong; API đã chạy thử trên server dev, hộp thoại chưa bấm thử |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **`pets/domain/confirm-name.ts`:** `normalizeForConfirm` (NFC, trim, chữ thường theo `vi`) và `matchesConfirmName`. Giữ dấu: "mít" ≠ "mit". Web có bản sao y hệt trong `features/pets/format.ts` (web không được import code của API).
- **`DELETE /api/v1/pets/{petId}`** body `{ confirmName }` (1–200 ký tự) → `204`. Cần CSRF, không cần `Idempotency-Key`.
  - Use case `deletePet` chạy trong một transaction:
    1. Khóa dòng thú cưng (`FOR UPDATE`); không có → `404`.
    2. Tên không khớp → `422 CONFIRM_NAME_MISMATCH`, kèm `errors[{ field: "confirmName", message: "Tên không khớp" }]`.
    3. `DELETE` dòng thú cưng; bảng con của S3–S5 sẽ khai báo `ON DELETE CASCADE`.
    4. Gửi `media.purge-prefix` cho `u/{owner}/p/{pet}/` cùng transaction.
  - Upload đang xử lý của thú cưng này sẽ bị worker đánh dấu `FAILED`, vì không còn mục tiêu (S2-03).
- **Repository:** thêm `lockForDelete` và `delete`.
- **IDOR:** body `DELETE` dùng tên `Mochi` của fixture, nên ca "B xóa con của mình" trả `204`.
- **Web:**
  - `useDeletePet`: xóa cache `['pets', id]` và invalidate `['pets']`.
  - `DeletePetDialog` (CMP-14), mở từ link "Xóa thú cưng" trên SCR-08 bằng `?dialog=delete-pet` (nút Back đóng được):
    - Icon cảnh báo, tiêu đề "Xóa {tên}?", nội dung cảnh báo.
    - Ô nhập 'Nhập "{tên}" để xác nhận' kèm gợi ý, `autocomplete="off"`, tự focus (`autofocus` + `showModal()`).
    - "Xóa vĩnh viễn" (đỏ) chỉ bật khi tên khớp, có `aria-describedby`; "Hủy" viền hồng. Đang gửi thì khóa cả hai nút.
    - Thành công: nếu thú cưng đang chọn là con vừa xóa thì bỏ chọn (hook tự chọn con đầu tiên còn lại). Về `/pets` bằng `replace`, toast "Đã xóa {tên}".
    - `422` → "Tên không khớp" dưới ô nhập. `404` → về `/pets`. Lỗi mạng → toast "Thử lại".
- **Test:** `matchesConfirmName` 5 ca (khoảng trắng, chữ hoa, thiếu dấu, NFD so với NFC, tên khác).

## Tiêu chí chấp nhận

**Đã kiểm trên server dev** (tạo thú cưng tạm "Mít tạm" có ảnh đại diện, 2 tệp):
- `confirmName` "mit tam" → `422 CONFIRM_NAME_MISMATCH`.
- "  MÍT TẠM " → `204`. Sau khoảng 4 giây không còn tệp nào của thú cưng đó; ảnh của Mochi giữ nguyên.
- `GET` sau khi xóa → `404`; xóa lần nữa → `404`.
- Typecheck, lint, depcruise, `vite build`, 126 unit test.

**Chưa kiểm:** bấm thử hộp thoại trên trình duyệt (focus, Esc, nút Back, PetSwitcher đổi con); cascade các bảng con (chưa có, S3–S5 thêm ca); bộ test IDOR.

## Khác với file task

- **Hàm so khớp tên có hai bản** (API và web), vì web không được import từ `apps/api` và repo chưa có package dùng chung.
- **Lỗi `422` dùng mã gốc `CONFIRM_NAME_MISMATCH`** (không phải `VALIDATION_FAILED`), kèm mảng `errors` để client gán vào ô nhập.
