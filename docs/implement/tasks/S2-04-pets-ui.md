# S2-04 · Giao diện SCR-07, 08, 09 và PetSwitcher

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S2 · T5–6 |
| Story | US-010, US-011, US-012, US-013, US-015 |
| Yêu cầu | FR-PET-001→007, FR-GEN-004, 005, 008, NFR-SEC-007, UXD-001→009 |
| Phụ thuộc | [S2-01](S2-01-pets-api.md), [S2-03](S2-03-pet-avatar-api.md) |
| Ước lượng | 2 |
| Màn hình Figma | SCR-07 · Danh sách thú cưng (12:1553); SCR-08 · Hồ sơ thú cưng (12:1635); SCR-09 · Thêm thú cưng (12:1728); SCR-09 · Sửa thú cưng (12:1791); PetSwitcher mở (21:2115) |

## Mục tiêu

Người dùng tạo, xem, sửa hồ sơ thú cưng, đặt ảnh đại diện và chuyển giữa tối đa 10 thú cưng bằng một thao tác; thú cưng đang chọn được nhớ theo thiết bị.

## Phạm vi

**Trong phạm vi:** route `/pets`, `/pets/:petId`, `/pets/new`, `/pets/:petId/edit` (chunk lazy `pets`); `PetSwitcher` (CMP-04) trong `TopBar`; `PetAvatar` (ảnh hoặc chữ cái đầu); ô ảnh đại diện có tiến trình; hook thú cưng đang chọn.

**Ngoài phạm vi:** hộp xóa thú cưng ([S2-05](S2-05-delete-pet.md), ở đây chỉ đặt link "Xóa thú cưng"); mục "Tất cả thú cưng" trong PetSwitcher (S5-04, chỉ Dashboard); chỉ số trên 4 lối tắt của SCR-08 (S3, S4, S5 bổ sung); khôi phục bản nháp khi hết phiên (S6-03).

## Chi tiết kỹ thuật

**Vị trí mã** (UI/UX Blueprint §3.1.1)

```
apps/web/src/routes/pets/{index.tsx,$petId.tsx,new.tsx,$petId.edit.tsx}
apps/web/src/features/pets/
  queries.ts            # petsQuery ['pets'], petQuery ['pets', id], mutation create/update
  useSelectedPet.ts     # localStorage ph.selectedPetId
  PetSwitcher.tsx  PetAvatar.tsx  PetCard.tsx  PetForm.tsx  AvatarField.tsx
  uploadAvatar.ts       # XHR có progress + poll /uploads/{id}
apps/web/src/i18n/vi.ts # mọi chuỗi bên dưới
```

**Dữ liệu**

- Loader mỗi route gọi `queryClient.ensureQueryData` với `staleTime: 0` và chờ dữ liệu mới (FR-GEN-008). Mutation thành công → `invalidateQueries(['pets'])`.
- `useSelectedPet()`: đọc `ph.selectedPetId` (bọc `try/catch`); ID không có trong `GET /pets` → chọn thú cưng đầu tiên và ghi lại. Tạo mới → đặt ID mới. Mọi query key theo thú cưng có `petId` để không lẫn dữ liệu.
- Đổi thú cưng trên route có `:petId` → điều hướng tới cùng route với `petId` mới (ví dụ `/pets/A` → `/pets/B`).

**Form** (React Hook Form + schema Zod sinh từ OpenAPI, server luôn kiểm lại)

1. Mở `/pets/new` → `idempotencyKey = crypto.randomUUID()`; giữ nguyên khi "Thử lại".
2. Lỗi client: trống → "Trường bắt buộc"; ngày sinh > ngày hiện tại của thiết bị → "Ngày sinh không được ở tương lai"; tên > 50 → "Tối đa 50 ký tự". `DateField` đặt `max` = hôm nay.
3. Lỗi server `422` → gán `errors[].message` vào đúng trường; `409 PET_LIMIT_REACHED` → toast lỗi "Đã đạt tối đa 10 thú cưng"; timeout 10 s → toast "Không lưu được. Kiểm tra kết nối rồi thử lại." + [Thử lại].
4. Tạo thành công → `setSelectedPet(id)` → nếu đã chọn ảnh thì tải ảnh (bước dưới) → điều hướng `/` với toast "Đã thêm {tên}". Sửa thành công → `/pets/:petId` + toast "Đã lưu".
5. `/pets/new` khi đã có 10 thú cưng → chuyển về `/pets`.

**Ảnh đại diện (`AvatarField`, CMP-23 một ảnh)**

- `<input type="file" accept="image/jpeg,image/png,image/heic,.heic">`. Kiểm ở client: > 5 MB → "Ảnh vượt 5 MB"; MIME/đuôi khác → "Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)". Không gửi request khi lỗi.
- Tải bằng `XMLHttpRequest` (cần `upload.onprogress`), kèm `X-CSRF-Token`. Trạng thái: `uploading (n%)` → `processing` → `ready` | `error` + "Thử lại". Sau `202` thăm dò `GET /uploads/{id}` mỗi 1 s, tối đa 20 s; `READY` → `invalidateQueries(['pets', id])`.
- Xem trước: JPG/PNG bằng `URL.createObjectURL`; HEIC hiện icon ảnh tới khi `READY` (Chrome không hiển thị HEIC).
- Form tạo: ảnh chỉ tải sau khi `POST /pets` thành công. Nếu tải ảnh lỗi → thú cưng vẫn được tạo, chuyển sang `/pets/:id/edit` với ô ảnh ở trạng thái lỗi + "Thử lại" (không tạo trùng).
- Form sửa: "Đổi ảnh" tải ngay; "Gỡ ảnh" → `DELETE /pets/{id}/avatar` → toast "Đã gỡ ảnh". Hai thao tác này độc lập với nút "Lưu thay đổi".

**`PetAvatar`**: có `avatarThumbUrl` → `<img alt="Ảnh đại diện của {tên}">`; `onError` (URL hết hạn `403`) → refetch `['pets']` một lần. Không có → vòng tròn nền `--primary-soft`, chữ cái đầu của tên viết hoa (lấy grapheme đầu bằng `Intl.Segmenter`), màu `--primary-soft-fg`. Kích thước: 24 (TopBar), 32 (danh sách switcher), 64 (SCR-07), 96 (SCR-08 phone), 112 (SCR-08 tablet).

## Giao diện

**SCR-07 · Danh sách thú cưng (12:1553)** — tiêu đề "Thú cưng" + chuông. Hàng trên: "{n}/10 thú cưng" bên trái, nút primary "+ Thêm thú cưng" bên phải. Card: avatar 64, tên đậm, dòng phụ "{ageText} · {breed} · {Đực|Cái}", chevron `>`; chạm card → SCR-08. Khi đủ 10: nút disabled kèm chú thích "Đã đạt tối đa 10 thú cưng" (`aria-describedby`). 0 thú cưng: `EmptyState` "Thêm thú cưng đầu tiên để bắt đầu" + "+ Thêm thú cưng". Lưới 1 cột (< 768), 2 cột (768–1279), 3 cột (≥ 1280).

**SCR-08 · Hồ sơ thú cưng (12:1635)** — thanh trên: `<` quay lại, "Hồ sơ thú cưng", link "Sửa". Avatar 96, tên (h1), "7 năm 7 tháng · Poodle · Cái", "Sinh 15/03/2019". Thẻ "ĐẶC ĐIỂM NHẬN DẠNG" (ẩn khi trống, giữ xuống dòng). 4 lối tắt 2 × 2 có icon: "Cân nặng" → `/pets/:id/health/weight`, "Sổ y tế" → `/pets/:id/health/visits`, "Lịch mốc" → `/pets/:id/milestones`, "Việc hằng ngày" → `/pets/:id/routines` (ở S2 chỉ nhãn). Cuối trang: link đỏ "Xóa thú cưng" + "Xóa toàn bộ số đo, sổ y tế, ảnh và lịch của {tên}. Không hoàn tác được." Tablet: 2 cột, thẻ hồ sơ 340 px (avatar 112, nút xóa) · phải đặc điểm + lối tắt 2 × 2; desktop: thẻ 380 px, 4 lối tắt trên 1 hàng.

**SCR-09 · Thêm (12:1728) / Sửa (12:1791)** — tiêu đề "Thêm thú cưng" / "Sửa hồ sơ · {tên}", nút `✕` đóng. Ô ảnh tròn viền đứt, icon ảnh, "Thêm ảnh đại diện", gợi ý "JPG, PNG, HEIC · tối đa 5 MB"; dạng sửa: avatar + "Đổi ảnh" · "Gỡ ảnh". Trường: "Tên *" (gợi ý "1–50 ký tự"), "Giống *", "Giới tính *" (segmented "Đực" | "Cái", không chọn sẵn), "Ngày sinh *" (gợi ý "Tuổi được tính tự động · không được ở tương lai"), "Đặc điểm nhận dạng" (bộ đếm "n / 2000"). Nút "Lưu" / "Lưu thay đổi" dính đáy trên phone, có spinner khi gửi. Lỗi: viền đỏ + thông điệp dưới trường, `aria-invalid`, focus vào trường lỗi đầu tiên. Tablet/desktop: ảnh bên trái + thẻ form, Giống/Giới tính ghép 2 cột, nút "Hủy" / "Lưu" căn phải.

**PetSwitcher (21:2115)** — nút trong TopBar: avatar 24 + tên + `▾`. Mở `ResponsiveDialog` (bottom sheet phone, modal 480 px ≥ 768): "Chọn thú cưng" + "{n}/10"; mỗi dòng avatar 32, tên, "{ageText} · {breed}"; dòng đang chọn nền `--primary-soft` + dấu ✓; cuối danh sách "+ Thêm thú cưng" (disabled + "Đã đạt tối đa 10 thú cưng" khi đủ 10). Chọn → đóng sheet, đổi dữ liệu ngay. `role="listbox"`, phím ↑/↓/Enter/Esc. 0 thú cưng: TopBar hiện nút "+ Thêm thú cưng" thay cho switcher.

## Tiêu chí chấp nhận

- [ ] Given có < 10 thú cưng, When nhập tên, giống, giới tính, ngày sinh hợp lệ và bấm "Lưu", Then hồ sơ được tạo, xuất hiện trong bộ chọn và trở thành thú cưng đang chọn; về Dashboard với toast "Đã thêm {tên}".
- [ ] Given thiếu trường bắt buộc, When bấm "Lưu", Then trường thiếu viền đỏ kèm "Trường bắt buộc", không gửi request.
- [ ] Given ngày sinh ở tương lai, When bấm "Lưu", Then hiển thị "Ngày sinh không được ở tương lai" (cả lỗi client lẫn lỗi `422` của server).
- [ ] Tuổi hiển thị dạng "N năm M tháng" lấy từ `ageText` của API; đổi ngày sinh thì tuổi đổi sau khi lưu.
- [ ] Đặc điểm nhận dạng hiển thị trong hồ sơ; ảnh JPG/PNG/HEIC ≤ 5 MB đặt, thay, gỡ được; chưa có ảnh thì hiện chữ cái đầu.
- [ ] Given hồ sơ tồn tại, When sửa bất kỳ trường nào và lưu, Then giá trị mới hiển thị ở SCR-07, SCR-08, PetSwitcher sau khi tải lại.
- [ ] Given có 10 thú cưng, When mở SCR-07 hoặc PetSwitcher, Then "Thêm thú cưng" bị vô hiệu kèm "Đã đạt tối đa 10 thú cưng".
- [ ] Given có ≥ 2 thú cưng, When chọn con khác trong bộ chọn, Then màn hình chuyển sang dữ liệu con đó trong 1 thao tác, không lẫn dữ liệu.
- [ ] Tải lại trang giữ thú cưng đang chọn; `ph.selectedPetId` không hợp lệ → chọn con đầu tiên.
- [ ] Ảnh > 5 MB bị báo "Ảnh vượt 5 MB" mà không gửi request; tiến trình % hiển thị khi tải.
- [ ] Khớp frame Figma ở 390 px; 768 px và 1280 px không có thanh cuộn ngang; thao tác được hoàn toàn bằng bàn phím.

## Kiểm thử

- **Component** (Vitest + Testing Library): `PetForm` báo lỗi từng trường; map `422` vào trường; `PetAvatar` chữ cái đầu với "mochi" → "M", "Ếch" → "Ế"; `useSelectedPet` với localStorage rỗng, ID lạ, localStorage ném lỗi; `PetSwitcher` disabled ở 10.
- **E2E** (Playwright, 4 viewport, staging): tạo thú cưng đầu tiên → Dashboard; tạo đủ 10 → nút disabled; chuyển thú cưng rồi reload → vẫn đúng con; sửa ngày sinh → tuổi đổi; tải `iphone-gps.heic` → avatar hiển thị trong ≤ 20 s; gỡ ảnh → chữ cái đầu.
- **Thủ công:** iPhone Safari chọn ảnh từ thư viện (HEIC) và chụp mới bằng camera; Android Chrome.
