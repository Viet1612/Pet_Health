# S2-05 · Xóa thú cưng (API + giao diện)

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S2 · T5–6 |
| Story | US-014 |
| Yêu cầu | FR-PET-008, SD-009, BR-039, FR-AUTH-013, NFR-SEC-004 |
| Phụ thuộc | [S2-04](S2-04-pets-ui.md) |
| Ước lượng | 0,5 |
| Màn hình Figma | SCR-08 · Xóa thú cưng (12:1851) |

## Mục tiêu

Người dùng xóa vĩnh viễn một thú cưng cùng mọi dữ liệu và ảnh của nó sau khi nhập lại đúng tên; ảnh trên đĩa được dọn bằng job `media.purge-prefix`.

## Phạm vi

**Trong phạm vi:** `DELETE /api/v1/pets/{petId}`; so khớp tên theo SD-009; cascade trong DB; enqueue xóa thư mục ảnh; `TypeToConfirmDialog` (CMP-14) trên SCR-08; cập nhật thú cưng đang chọn sau khi xóa; ca IDOR.

**Ngoài phạm vi:** các bảng con (`weight_entries`, `visits`, `visit_photos`, `milestones`, `notifications`, `routine_tasks`, `routine_completions`) do S3–S5 tạo, mỗi bảng tự khai báo `pet_id … ON DELETE CASCADE` và thêm ca vào test cascade của task này; xóa cả tài khoản (S6-01).

## Chi tiết kỹ thuật

**Vị trí mã**

```
apps/api/src/modules/pets/domain/confirm-name.ts      # normalizeForConfirm(), matches()
apps/api/src/modules/pets/application/delete-pet.ts
apps/api/src/modules/pets/adapters/http/pets.routes.ts # thêm DELETE
apps/web/src/features/pets/DeletePetDialog.tsx
```

**So khớp tên (SD-009)**

```ts
const normalizeForConfirm = (s: string) => s.normalize('NFC').trim().toLocaleLowerCase('vi');
export const matches = (input: string, petName: string) =>
  normalizeForConfirm(input) === normalizeForConfirm(petName);
```

Dùng cùng hàm ở web (bật nút) và API (quyết định). Không bỏ dấu tiếng Việt: "mít" ≠ "mit".

**Endpoint**

| Method + Path | Input | Thành công | Lỗi |
|---|---|---|---|
| `DELETE /api/v1/pets/{petId}` | `{ confirmName: string }` (1–200 ký tự) | `204` | `404 NOT_FOUND`, `422 CONFIRM_NAME_MISMATCH` |

Yêu cầu `X-CSRF-Token`; không cần `Idempotency-Key` (gọi lại sau khi xóa → `404`).

**Use case `deletePet`** (một transaction)

1. `set_config('app.user_id', …)`; `SELECT id, name FROM pets WHERE id=$1 AND owner_id=$2 FOR UPDATE`; không có → `404`.
2. `!matches(confirmName, name)` → `422 CONFIRM_NAME_MISMATCH`, `errors[{ field: "confirmName", message: "Tên không khớp" }]`.
3. `DELETE FROM pets WHERE id=$1` → cascade xóa số đo, bản ghi khám, ảnh khám, mốc, thông báo của mốc, việc hằng ngày và lượt hoàn thành.
4. `boss.send('media.purge-prefix', { prefix: 'u/{ownerId}/p/{petId}/' }, { retryLimit: 10 })` trong cùng transaction (AD-006).
5. `COMMIT` → `204`. Upload `AVATAR`/`VISIT_PHOTO` đang `PROCESSING` của thú cưng này sẽ bị worker đánh dấu `FAILED` vì không còn mục tiêu (S2-02, S2-03).

Sau bước 3 không còn URL ký nào được cấp cho ảnh của thú cưng; URL đã cấp trả `404` khi tệp đã bị xóa.

## Giao diện

**SCR-08 · Xóa thú cưng (12:1851)** — chạm "Xóa thú cưng" ở cuối SCR-08 mở `ResponsiveDialog` (bottom sheet phone, modal 480 px ≥ 768) có `?dialog=delete-pet` để nút Back đóng được.

- Icon cảnh báo tròn nền đỏ nhạt; tiêu đề "Xóa {tên}?".
- Nội dung: "Toàn bộ số đo cân nặng, sổ y tế kèm ảnh, lịch mốc y tế, việc hằng ngày và nhắc nhở của {tên} sẽ bị xóa vĩnh viễn. Không hoàn tác được." (Figma có số lần khám, ví dụ "4 lần khám kèm ảnh"; thêm số này khi S3 có dữ liệu.)
- Ô nhập: nhãn 'Nhập "{tên}" để xác nhận', gợi ý "Không phân biệt hoa thường, bỏ khoảng trắng đầu và cuối", `autocomplete="off"`, focus tự động.
- Nút "Xóa vĩnh viễn" (danger, đỏ, toàn chiều rộng) chỉ bật khi `matches()` đúng; nút "Hủy" viền hồng bên dưới. Đang gửi → spinner trong nút, khóa cả hai nút.
- Thành công: đóng dialog → `invalidateQueries(['pets'])` và xóa cache `['pets', id]` → nếu `ph.selectedPetId` là thú cưng vừa xóa thì chọn thú cưng đầu tiên còn lại (hoặc xóa khóa khi hết) → điều hướng `/pets` → toast "Đã xóa {tên}".
- `422` → lỗi dưới ô nhập "Tên không khớp", giữ dialog; `404` → đóng dialog, về `/pets`; timeout → toast "Không lưu được. Kiểm tra kết nối rồi thử lại." + [Thử lại].
- Trợ năng: `role="dialog"`, `aria-modal`, bẫy focus, Esc đóng, trả focus về link "Xóa thú cưng"; nút Xóa disabled có `aria-describedby` trỏ tới nhãn ô nhập.

## Tiêu chí chấp nhận

- [ ] Hộp xác nhận yêu cầu nhập lại đúng tên thú cưng; nút "Xóa vĩnh viễn" chỉ bật khi tên khớp (bỏ khoảng trắng đầu/cuối, không phân biệt hoa thường).
- [ ] Xóa xong thì mọi số đo, sổ y tế, ảnh, mốc, thông báo và việc của thú cưng đó bị xóa; không hoàn tác được.
- [ ] API từ chối `confirmName` sai bằng `422 CONFIRM_NAME_MISMATCH` kể cả khi client bị bỏ qua.
- [ ] Thư mục `media/u/{userId}/p/{petId}/` không còn sau khi job chạy; thú cưng khác của cùng tài khoản giữ nguyên ảnh.
- [ ] Thú cưng đang chọn bị xóa → PetSwitcher chuyển sang con đầu tiên còn lại; không còn thú cưng → TopBar hiện "+ Thêm thú cưng".
- [ ] Sau khi xóa, số thú cưng giảm và nút "Thêm thú cưng" bật lại nếu trước đó đủ 10.
- [ ] `DELETE /pets/{petIdCủaNgườiKhác}` → `404`, dữ liệu không đổi.

## Kiểm thử

- **Unit** (`confirm-name.test.ts`): "Mochi" vs " mochi " → khớp; "MOCHI" → khớp; "Moch" → không; "Mít" vs "mít" → khớp; "Mít" vs "Mit" → không; chuỗi NFD vs NFC của "Mít" → khớp; chuỗi rỗng → không.
- **Integration:** tạo thú cưng có avatar → `DELETE` đúng tên → `204`, `pets` không còn dòng, job `media.purge-prefix` có trong `pgboss.job` với đúng prefix, chạy job → thư mục mất; `DELETE` sai tên → `422`, dòng còn nguyên; xóa lần 2 → `404`. Test cascade chứa sẵn khung để S3–S5 thêm bảng con (mỗi bảng: chèn 1 dòng, xóa thú cưng, đếm = 0).
- **IDOR:** user B `DELETE` thú cưng của A với đúng tên → `404`.
- **E2E** (Playwright): mở SCR-08 → "Xóa thú cưng" → nhập sai thì nút disabled → nhập " mochi " → xóa → về `/pets`, toast hiển thị, thú cưng không còn trong PetSwitcher.
