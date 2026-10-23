# S3-05 · Giao diện SCR-11, 12, 13, ảnh, lightbox

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S3 · T7–8 |
| Story | US-030, US-031, US-032, US-033, US-034 |
| Yêu cầu | FR-VIS-001→008; FR-GEN-002→006, 009, 010, 012; NFR-USA-002; UXD-009 |
| Phụ thuộc | [S3-03](S3-03-visits-api.md), [S3-04](S3-04-visit-photos-api.md) |
| Ước lượng | 2,5 ngày |
| Màn hình Figma | SCR-11 · Sức khỏe / Sổ y tế (10:911); SCR-12 · Chi tiết lần khám (10:1056); SCR-12 · Lightbox ảnh (10:1173); SCR-13 · Thêm lần khám (10:1206); SCR-13 · Sửa lần khám (23:3061) |

## Mục tiêu

Tab Sổ y tế: danh sách lần khám cuộn tải thêm, chi tiết, thêm/sửa/xóa lần khám, đính kèm tối đa 5 ảnh với tiến trình và "Thử lại" riêng từng ảnh, xem ảnh lớn trong lightbox. Ở ≥ 768 px danh sách và chi tiết nằm cạnh nhau.

## Phạm vi

**Trong phạm vi:** route SCR-11, SCR-12, SCR-13 (thêm, sửa); `VisitList`, `VisitDetail`, `VisitForm`; `PhotoUploader` + `PhotoGrid` + `Lightbox` (CMP-23); `TextAreaCounter` (CMP-18) nếu S0-07 chưa có; kho tải ảnh dùng chung.

**Ngoài phạm vi:** segmented "Cân nặng | Sổ y tế" và layout `/pets/:petId/health` ([S3-02](S3-02-weights-ui.md)); lưu bản nháp khi hết phiên và banner mất mạng toàn cục ([S6-03](S6-03-system-states.md)); ô ảnh đại diện SCR-09 ([S2-04](S2-04-pets-ui.md)).

## Chi tiết kỹ thuật

**Route** (Blueprint §3.1.1)

| Màn hình | Path | File |
|---|---|---|
| SCR-11 | `/pets/:petId/health/visits` | `apps/web/src/routes/pets.$petId.health.visits.tsx` |
| SCR-12 | `/visits/:visitId` | `routes/visits.$visitId.tsx` |
| SCR-13 thêm | `/pets/:petId/visits/new` | `routes/pets.$petId.visits.new.tsx` |
| SCR-13 sửa | `/visits/:visitId/edit` | `routes/visits.$visitId.edit.tsx` |

Thành phần trong `apps/web/src/features/visits/`: `VisitList.tsx`, `VisitListItem.tsx`, `VisitDetail.tsx`, `VisitForm.tsx`, `queries.ts`; `features/photos/`: `PhotoUploader.tsx`, `PhotoTile.tsx`, `PhotoGrid.tsx`, `Lightbox.tsx` (lazy), `upload-store.ts`, `upload.ts`.

**Dữ liệu**

1. Danh sách: `useInfiniteQuery(['visits', petId])` → `GET /pets/{petId}/visits?limit=20&cursor`; `IntersectionObserver` trên phần tử cuối (rootMargin 200 px) gọi `fetchNextPage`; nút "Tải thêm" dự phòng cho bàn phím, ẩn khi `nextCursor = null`.
2. Chi tiết: `['visit', visitId]` → `GET /visits/{id}`. Ảnh `<img>` lỗi tải (URL ký hết hạn sau 15 phút) → `invalidateQueries(['visit', visitId])` một lần để lấy URL mới.
3. Mọi mutation → invalidate `['visits', petId]`, `['visit', visitId]`.
4. Form tạo sinh `Idempotency-Key` khi mở form; "Thử lại" dùng lại key (FR-GEN-005).

**Kiểm tra form (client, server kiểm lại)**

- Đếm ký tự theo code point sau NFC (`[...s.normalize('NFC')].length`), khớp server.
- > 2.000 ký tự ở bất kỳ trường nào → bộ đếm đỏ, nút lưu disabled. Bộ đếm có `aria-live="polite"` khi còn ≤ 10% (≥ 1.800).
- Thiếu cả Triệu chứng và Chẩn đoán (sau `trim`) khi bấm lưu → lỗi dưới cả hai trường "Cần ít nhất triệu chứng hoặc chẩn đoán", focus trường đầu tiên.
- Ngày khám: DateField `max` = hôm nay theo `user.timezone`; trống → "Trường bắt buộc"; tương lai → "Ngày không được ở tương lai".

**Tải ảnh (FLW-07, ST-04)**

1. `upload-store.ts`: store cấp ứng dụng (ngoài cây route) giữ hàng đợi theo `visitId`, để việc tải tiếp tục khi chuyển màn hình. Mỗi mục: `{ localId, file, previewUrl, state, progress, idempotencyKey, photoId?, uploadId?, error? }`.
2. Chọn tệp (`<input type="file" multiple accept="image/jpeg,image/png,image/heic,.heic">`, không đặt `capture` để điện thoại mở cả camera và thư viện). Kiểm từng tệp, báo lỗi riêng, không chặn tệp hợp lệ:
   - MIME hoặc đuôi không thuộc JPG/PNG/HEIC/HEIF → "Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)".
   - `size > 5_242_880` → "Ảnh vượt 5 MB".
   - Ảnh hiện có (không tính lỗi) + đang chờ > 5 → các tệp dư bị từ chối "Tối đa 5 ảnh mỗi lần khám".
3. Tải: `XMLHttpRequest` (cần `upload.onprogress`) `POST /api/v1/visits/{id}/photos` với `X-CSRF-Token`, `Idempotency-Key`; tối đa 2 ảnh tải song song; hủy nếu 10 s không có sự kiện tiến trình.
4. `202` → "Đang xử lý" → thăm dò `GET /uploads/{uploadId}` mỗi 1 s, tối đa 20 lần (20 s). `READY` → hiện thumbnail, invalidate `['visit', visitId]`. `FAILED` hoặc quá 20 s → "Lỗi" + "Thử lại".
5. Lỗi `413`/`415`/`409` → hiện thông điệp tương ứng ở ô, không có "Thử lại" (thử lại cũng lỗi). Lỗi mạng/timeout → "Thử lại" gửi lại **cùng** key.
6. "Thử lại" sau `FAILED` hoặc quá 20 s: nếu đang có `photoId` mà ảnh còn `PROCESSING` thì `DELETE /photos/{photoId}` trước, rồi gửi lại với key **mới**.
7. Tạo mới: bấm "Lưu" → `POST /pets/{petId}/visits` → đưa các ảnh đã chọn vào hàng đợi với `visitId` mới → chuyển tới `/visits/{id}` kèm toast "Đã lưu". Người dùng không phải đợi ảnh. Sửa: ảnh tải ngay khi chọn.

## Giao diện

**SCR-11 (10:911)** — dưới segmented: dòng "4 lần khám · mới nhất trước" (`totalCount`) và nút primary "+ Thêm lần khám" → SCR-13. Mỗi thẻ: ô ngày (ngày lớn `20`, dưới `09/2026`, nền `--primary-soft`), tiêu đề = chẩn đoán 1 dòng (không có chẩn đoán thì dùng triệu chứng), dòng phụ = triệu chứng 1 dòng (ẩn khi đã làm tiêu đề), icon ảnh + số ảnh (ẩn khi 0), chevron `>`. Trống: EmptyState "Chưa có lần khám nào được ghi." + "+ Thêm lần khám". Đang tải trang kế: 2 skeleton thẻ.

**SCR-12 (10:1056)** — TopBar: ← , "Chi tiết lần khám", ⋮ (Sửa, Xóa). h1 ngày `20/09/2026`; dòng phụ "Mochi · ghi lúc 20/09/2026 18:40" (`createdAt` theo múi giờ tài khoản). Khối "TRIỆU CHỨNG", "CHẨN ĐOÁN", "ĐƠN THUỐC" giữ xuống dòng (`white-space: pre-wrap`), khối trống thì ẩn. "ẢNH ĐÍNH KÈM" + "3 ảnh · chạm để phóng to"; lưới thumbnail 3 cột; ảnh `PROCESSING` hiện ô "Đang xử lý". Cuối trang: nút secondary "Sửa" và nút chữ đỏ "Xóa lần khám". Xóa → ConfirmDialog nguy hiểm "Xóa lần khám này và 3 ảnh đính kèm?" (0 ảnh: "Xóa lần khám này?"), "Hủy" (focus mặc định) / "Xóa"; xong → về SCR-11, toast "Đã xóa lần khám".

**Lightbox (10:1173)** — nền tối toàn màn hình, ✕ (`aria-label="Đóng"`), bộ đếm "2 / 3", ảnh `url` 2048 px `object-fit: contain`, nút ‹ › hai bên, gợi ý "Vuốt hoặc phím ← →", chú thích "Ảnh đính kèm 2/3 — lần khám 20/09/2026" (cũng là `alt`). Vuốt trái/phải, phím ←/→, Esc đóng; bẫy focus, trả focus về thumbnail đã mở. Tải lazy.

**SCR-13 thêm (10:1206)** — TopBar ✕ "Thêm lần khám" (✕ khi đã nhập → ConfirmDialog "Bỏ thay đổi?").
- "Ngày khám *" DateField, gợi ý "Mặc định hôm nay · không được ở tương lai".
- "Triệu chứng", "Chẩn đoán" TextAreaCounter "44 / 2000"; dưới hai trường dòng cố định "Cần ít nhất triệu chứng hoặc chẩn đoán."
- "Đơn thuốc" placeholder "Tên thuốc, liều dùng, số ngày…", bộ đếm "0 / 2000".
- "Ảnh đính kèm" + phải "3/5 · JPG, PNG, HEIC ≤ 5 MB". Ô ảnh 76 px: sẵn sàng (thumbnail), đang tải (thanh tiến trình + "62%"), đang xử lý, lỗi (viền đỏ, icon ! , "Thử lại"), bị từ chối (thông điệp + ✕ bỏ). Ô cuối viền nét đứt "+ Thêm ảnh", ẩn khi đủ 5.
- Nút "Lưu" dính đáy, loading + disabled khi gửi.

**SCR-13 sửa (23:3061)** — tiêu đề "Sửa lần khám · 20/09/2026", điền sẵn dữ liệu; mỗi ô ảnh có nút ✕ (`aria-label="Xóa ảnh 2"`) → ConfirmDialog "Xóa ảnh này?" → `DELETE /photos/{id}`; nút chữ đỏ "Xóa lần khám" (cùng dialog SCR-12); nút dính đáy "Lưu thay đổi" → về SCR-12, toast "Đã lưu".

**Lỗi chung:** `422` hiện dưới trường; timeout 10 s → "Không lưu được. Kiểm tra kết nối rồi thử lại." + "Thử lại", form giữ nguyên; 5xx → toast kèm `ref`.

**Responsive (UXD-009, §3.1.5)**

- < 768: SCR-11 và SCR-12 là hai trang riêng; SCR-13 1 cột, nút Lưu dính đáy.
- 768–1279: SCR-11 + SCR-12 cạnh nhau — danh sách 360 px + khung chi tiết; mục đang chọn viền `--primary`. Route `/visits/:visitId` render trong khung chi tiết cạnh danh sách của thú cưng tương ứng; chưa chọn mục nào → khung hiện "Chọn một lần khám để xem chi tiết". SCR-13: thẻ form, trường ngắn ghép 2 cột, "Hủy" / "Lưu" căn phải.
- ≥ 1280: danh sách 440 px, thumbnail 160 px; SCR-13 ghép 3 trường văn bản trên 1 hàng.

## Tiêu chí chấp nhận

- [ ] Given đang xem sổ y tế, When nhập ngày khám (mặc định hôm nay) và ít nhất triệu chứng hoặc chẩn đoán rồi lưu, Then bản ghi được tạo và nằm đầu danh sách.
- [ ] Given thiếu ngày khám hoặc thiếu cả triệu chứng lẫn chẩn đoán, When lưu, Then bị từ chối, lỗi hiện tại trường tương ứng.
- [ ] Given một trường vượt 2.000 ký tự, When nhập, Then bộ đếm chuyển đỏ và nút lưu bị vô hiệu.
- [ ] Given bản ghi 2026-01-10, 2026-05-02, 2026-09-20, Then thứ tự 20/09, 02/05, 10/01; mỗi dòng có ngày, chẩn đoán 1 dòng và số ảnh.
- [ ] Given > 20 bản ghi, When cuộn tới cuối, Then 20 bản ghi tiếp theo được tải thêm; nút "Tải thêm" dùng được bằng bàn phím.
- [ ] Given bản ghi tồn tại, When sửa chẩn đoán và lưu, Then nội dung mới hiện sau khi tải lại.
- [ ] Given bấm "Xóa", Then hộp xác nhận hiện; "Hủy" giữ nguyên; "Xóa" xóa bản ghi cùng toàn bộ ảnh.
- [ ] Tối đa 5 ảnh, mỗi ảnh ≤ 5 MB, JPG/PNG/HEIC; tệp sai bị báo lỗi riêng mà các tệp hợp lệ vẫn tải.
- [ ] Trên điện thoại, "Thêm ảnh" mở được cả camera và thư viện ảnh.
- [ ] Mỗi ảnh có tiến trình riêng; ảnh lỗi có "Thử lại" và không chặn ảnh khác.
- [ ] Ảnh HEIC hiển thị thành JPG; chạm thumbnail mở lightbox, chuyển ảnh bằng vuốt, nút và phím ←/→.
- [ ] Mỗi ảnh có nút xóa riêng qua xác nhận; xóa xong ảnh biến mất và số ảnh ở danh sách giảm tương ứng.
- [ ] Tạo mới lưu được ngay, không chờ ảnh tải xong; ảnh tiếp tục tải sau khi chuyển sang SCR-12.
- [ ] ≥ 768 px: danh sách và chi tiết hiển thị cạnh nhau; mở `/visits/:id` trực tiếp vẫn đúng bố cục.

## Kiểm thử

- **Unit:** kiểm tệp (MIME rỗng nhưng đuôi `.heic` được nhận; `.gif` bị từ chối; 5.242.880 byte nhận, 5.242.881 từ chối; chọn 3 tệp khi đã có 3 ảnh → 2 nhận, 1 từ chối); đếm ký tự với tiếng Việt tổ hợp và emoji; máy trạng thái ô ảnh ST-04 (giả `XMLHttpRequest`, fake timers: 20 lần `PROCESSING` → `Failed`).
- **Component (Testing Library + MSW):** bộ đếm 2.000 → bình thường, 2.001 → đỏ + Lưu disabled; lỗi cả hai trường khi trống; "Thử lại" sau lỗi mạng dùng cùng key, sau `FAILED` dùng key mới; ConfirmDialog focus "Hủy".
- **E2E (Playwright, 390 × 844, 768 × 1024, 1280 × 800):** tạo lần khám kèm 1 JPG + 1 HEIC thật → cả hai `READY`; một PDF đổi đuôi `.jpg` → ô lỗi, ảnh khác không ảnh hưởng; tạo 25 bản ghi qua API → cuộn tải trang 2; sửa chẩn đoán; xóa 1 ảnh; xóa lần khám; kiểm bố cục danh sách + chi tiết ở 768 và 1280.
- **Thủ công:** iPhone Safari và Android Chrome mở camera/thư viện; VoiceOver đọc `alt` ảnh và lightbox.

## Ghi chú

- Blueprint ghi `accept="image/jpeg,image/png,image/heic,.heic"`; có thể thêm `image/heif,.heif` vì server chấp nhận `heix|mif1`.
- `Lightbox` và `PhotoUploader` là chunk lazy để không tăng JS ban đầu.
- Tablet/desktop: lấy kích thước chính xác từ trang *Screens · Tablet* và *Screens · Desktop* của file Figma.
