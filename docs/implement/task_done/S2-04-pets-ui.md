# S2-04 · Giao diện SCR-07, 08, 09 và PetSwitcher — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S2-04](../tasks/S2-04-pets-ui.md) |
| Trạng thái | Xong (code), chưa bấm thử trên trình duyệt |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `d715749` |

## Kết quả

- **Route** (dưới `_app`, có guard phiên):
  - `/pets`: SCR-07. Đếm "n/10"; nút thêm bị khóa ở 10 con kèm chú thích (`aria-describedby`). Trạng thái rỗng dùng `EmptyState`. Lưới 1/2/3 cột (< 768 / 768–1279 / ≥ 1280). Có skeleton khi tải.
  - `/pets/$petId`: SCR-08.
    - Avatar 96 (phone) / 112 (≥ 768), tên, "tuổi · giống · giới tính", "Sinh dd/mm/yyyy".
    - Thẻ "Đặc điểm nhận dạng" ẩn khi trống, giữ xuống dòng.
    - 4 lối tắt 2×2 (desktop 1 hàng 4). Cân nặng và Lịch mốc là link; Sổ y tế và Việc hằng ngày ghi "Sắp có".
    - Link "Xóa thú cưng" (đang khóa, S2-05 làm tiếp).
    - Mở hồ sơ con nào thì con đó thành thú cưng đang chọn.
  - `/pets/new`: SCR-09 thêm. Đã đủ 10 con thì chuyển về `/pets`.
    - `Idempotency-Key` giữ nguyên qua các lần thử lại.
    - Lưu xong: đặt thú cưng đang chọn, tải ảnh (nếu có), về `/` với toast "Đã thêm {tên}".
    - Ảnh tải lỗi: thú cưng vẫn được tạo; chuyển sang trang sửa với `?avatarFailed=1`, ô ảnh báo lỗi kèm "Thử lại" (giữ tệp trong bộ nhớ).
  - `/pets/$petId/edit`: SCR-09 sửa. "Đổi ảnh" và "Gỡ ảnh" chạy ngay, độc lập với "Lưu thay đổi". Lưu xong về hồ sơ với toast "Đã lưu".
  - Loader dùng `queryClient.query` với `staleTime: 0` (luôn lấy mới). `404` → trang không tìm thấy.
- **`features/pets/`:**
  - `queries.ts`: `petsQuery` (`['pets']`), `petQuery` (`['pets', id]`), `useCreatePet`, `useUpdatePet`, `useRemoveAvatar`. Mutation xong thì invalidate `['pets']`. Type `Pet` lấy từ OpenAPI.
  - `PetForm`:
    - React Hook Form + Zod: tên/giống 1–50 code point, giới tính bắt buộc, ngày sinh không sau hôm nay của thiết bị, mô tả ≤ 2000.
    - Giới tính là segmented "Đực | Cái" (radio), không chọn sẵn. Ngày sinh `max` = hôm nay. Bộ đếm mô tả "n / 2000".
    - `422` của server gán vào đúng trường và focus trường đầu. Lỗi mạng → toast "Thử lại". `PET_LIMIT_REACHED` → toast "Đã đạt tối đa 10 thú cưng".
    - Phone: nút Lưu dính đáy trên BottomNav. ≥ 768: ảnh bên trái, thẻ form bên phải, Giống/Giới tính 2 cột, "Hủy · Lưu" căn phải.
  - `AvatarPicker` (form tạo): chọn và xem trước (JPG/PNG bằng object URL; HEIC hiện tên tệp). Kiểm > 5 MB và định dạng ở client, không gửi request khi lỗi.
  - `AvatarEditor` (form sửa): tải ngay, hiện "Đang tải n%" rồi "Đang xử lý ảnh…". Có lỗi + "Thử lại", "Gỡ ảnh" (toast "Đã gỡ ảnh").
  - `upload-avatar.ts`: kiểm tệp; tải qua XHR (`api/upload-file.ts`, có tiến trình, gửi CSRF, 401 phát sự kiện hết phiên); hỏi `GET /uploads/{id}` mỗi 1 s, tối đa 20 s.
  - `PetAvatar`: ảnh đã ký hoặc chữ cái đầu (grapheme, `Intl.Segmenter`) trên nền primary-soft. Cỡ 24/32/64/96/112. Ảnh lỗi (URL hết hạn) → tải lại danh sách một lần.
  - `PetCard`: avatar 64, tên, dòng phụ, chevron.
  - `PetSwitcher` (CMP-04) trong TopBar:
    - Nút: avatar 24, tên, ▾.
    - Mở `ResponsiveDialog`: danh sách `role="listbox"`, phím ↑/↓/Enter, dòng đang chọn nền primary-soft kèm ✓. "+ Thêm thú cưng" ở cuối (khóa khi đủ 10).
    - Đổi con trên route có `:petId` → sang cùng route của con mới. 0 thú cưng → nút "+ Thêm thú cưng".
  - `useSelectedPet`: `useSyncExternalStore` trên `lib/selected-pet.ts` (localStorage `ph.selectedPetId`, có bản sao trong bộ nhớ khi bị chặn). ID không còn trong danh sách → chọn con đầu tiên.
- **i18n:** nhóm `vi.pets`.
- **Test:** `features/pets/pets.test.ts`, 4 ca.
  - `initialOf`: "mochi" → "M", "ếch" → "Ế", emoji.
  - `formatLocalDate`.
  - `avatarFileError`: JPG/PNG/HEIC không MIME; > 5 MB; GIF.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, depcruise, `vite build`, 4 unit test web. Dev server phục vụ được các module mới.

**Chưa kiểm** (cần bấm thử trên trình duyệt): toàn bộ luồng Given/When/Then, khớp Figma ở 390/768/1280 px, thao tác bằng bàn phím, HEIC từ iPhone.

## Khác với file task

- **Vị trí route:** `routes/_app/pets/{index,new}.tsx` và `routes/_app/pets/$petId/{index,edit}.tsx`, nằm dưới layout `_app` để có guard phiên. Spec ghi `routes/pets/...`.
- **Loader dùng `queryClient.query`** vì `ensureQueryData`/`fetchQuery` đã deprecated trong bản TanStack Query đang dùng.
- **Hàm XHR đặt ở `api/upload-file.ts`**, vì lint chỉ cho gọi mạng trong `src/api/`. `features/pets/upload-avatar.ts` dùng hàm này.
- **Schema form viết tay bằng Zod**, không sinh từ OpenAPI (input `PetCreate` của API khai báo chuỗi tùy chọn).
- **Hai lối tắt "Sổ y tế" và "Việc hằng ngày"** hiện "Sắp có" vì route của chúng chưa có (S3, S5).
- **Chưa có test component** (Testing Library) và E2E; mới có unit test hàm thuần.
