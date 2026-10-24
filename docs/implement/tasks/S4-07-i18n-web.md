# S4-07 · Hạ tầng đa ngôn ngữ web và bản tiếng Anh

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 (bổ sung, làm trước S5) |
| Story | — (yêu cầu bổ sung của chủ dự án, 2026-10-25) |
| Yêu cầu | FR-GEN-002 (định dạng ngày, số), UXD-001; mở rộng: giao diện tiếng Việt và tiếng Anh, chọn trong Cài đặt |
| Phụ thuộc | [S4-05](S4-05-notifications-ui.md) |
| Ước lượng | 1,5 ngày |
| Màn hình Figma | — (dùng lại mọi frame hiện có; chữ tiếng Anh thay chữ tiếng Việt) |

## Mục tiêu

Web hiển thị được tiếng Việt (mặc định) và tiếng Anh. Mọi chuỗi giao diện, định dạng ngày và số đi theo ngôn ngữ đang chọn. Người dùng đổi ngôn ngữ ở **Cài đặt → Ngôn ngữ**. Thêm ngôn ngữ thứ ba chỉ cần thêm một file từ điển.

## Phạm vi

**Trong phạm vi:**
- Từ điển `en.ts` cùng cấu trúc `vi.ts`, kiểu TypeScript buộc đủ key.
- Chọn ngôn ngữ lúc tải trang.
- Hàm định dạng ngày, số, kg theo ngôn ngữ.
- Đổi toàn bộ import `vi` trong web sang từ điển đang chọn.
- `<html lang>`.
- Mục **"Ngôn ngữ"** trong màn Cài đặt; ở task này lưu `localStorage`.

**Ngoài phạm vi:**
- Thông báo lỗi và chữ do API tính ([S4-08](S4-08-i18n-api.md)).
- Lưu ngôn ngữ theo tài khoản và email 2 ngôn ngữ ([S4-09](S4-09-user-locale-email.md)).
- Các mục khác của màn Cài đặt (S6-01, S6-02).
- Ngôn ngữ thứ ba.

## Chi tiết kỹ thuật

**Vị trí mã**

```
apps/web/src/i18n/
  vi.ts            # giữ nội dung; export type Messages (chuỗi literal → string, hàm giữ chữ ký)
  en.ts            # export const en: Messages
  locale.ts        # SUPPORTED = ['vi','en']; currentLocale(); setLocale(l) → lưu + tải lại trang
  index.ts         # export const m: Messages (từ điển đang dùng), export const locale
apps/web/src/lib/format.ts   # formatDate, formatDayMonth, formatDateTime, formatKg, formatSignedTenths
apps/web/src/routes/_app/settings.tsx   # mục "Ngôn ngữ"
```

**Chọn ngôn ngữ**

1. **Mặc định tiếng Việt.** Không tự đoán theo ngôn ngữ trình duyệt.
2. Ngôn ngữ đang dùng = `localStorage['ph.locale']` nếu hợp lệ, ngược lại `vi`. Từ S4-09: sau khi đăng nhập, `user.locale` của tài khoản thắng và được ghi đè vào `localStorage`.
3. `m` được chọn **một lần** khi module `i18n/index.ts` khởi tạo. Đổi ngôn ngữ = `setLocale(l)`: lưu `localStorage`, rồi `location.reload()`. Nhờ vậy các file đang viết `const t = vi.pets` ở đầu module chỉ cần đổi thành `const t = m.pets`, không phải chuyển sang hook.
4. `main.tsx` đặt `document.documentElement.lang = locale` trước khi render.

**Mục "Ngôn ngữ" trong Cài đặt** (`/settings`)

- Thẻ "Ngôn ngữ / Language" với lựa chọn dạng radio: "Tiếng Việt", "English". Nhãn mỗi lựa chọn viết bằng chính ngôn ngữ đó, để người không đọc được ngôn ngữ hiện tại vẫn tìm ra.
- Chọn khác ngôn ngữ hiện tại → `setLocale` → trang tải lại vẫn ở `/settings`, toast "Đã đổi ngôn ngữ" / "Language changed".
- Màn Cài đặt hiện chỉ là trang giữ chỗ; task này thêm khung trang (tiêu đề "Cài đặt") và đúng mục Ngôn ngữ. Các mục khác (múi giờ, mật khẩu, email, xóa tài khoản) để S6.
- Trên phone, Cài đặt vào được từ menu tài khoản (☰) trên TopBar; ≥ 768 px từ mục "Cài đặt" ở SideRail (đã có).

**Từ điển**

- `en.ts` khai báo `export const en: Messages = { … }`: thiếu hoặc thừa key là lỗi typecheck.
- Hàm ghép câu (số nhiều, vị trí số) nằm trong từ điển, ví dụ `count: (n) => \`${n} pets\``; tiếng Anh dùng dạng số ít/số nhiều đúng ("1 pet" / "2 pets").
- Không ghép câu từ mảnh ở component; mọi câu hoàn chỉnh nằm trong từ điển.

**Định dạng (`lib/format.ts`)**, dùng `Intl` theo `locale`:

| Hàm | vi | en |
|---|---|---|
| `formatDate('2026-11-15')` | `15/11/2026` | `Nov 15, 2026` |
| `formatDayMonth` | `15/11` | `Nov 15` |
| `formatDateTime(iso, tz)` | `15/11/2026 18:40` | `Nov 15, 2026, 6:40 PM` |
| `formatKg('9.3')` | `9,3 kg` | `9.3 kg` |
| `formatSignedTenths(-1)` | `−0,1` | `−0.1` |

Ngày `YYYY-MM-DD` định dạng với `timeZone: 'UTC'` để không lệch ngày. Thay các hàm định dạng đang rải ở `features/*/format.ts` bằng `lib/format.ts`. Ô nhập kg vẫn nhận cả `,` và `.` ở cả hai ngôn ngữ.

**Đổi import hàng loạt:** thay `import { vi } from '…/i18n/vi'` → `import { m } from '…/i18n'` và `vi.` → `m.` trong `apps/web/src` (trừ `i18n/vi.ts`). Chạy typecheck, lint, test.

## Giao diện

Mục Ngôn ngữ trong Cài đặt như mô tả trên (chưa có frame Figma; theo token và component hiện có: `Card`, radio lớn 44 px).

Kiểm bố cục với chuỗi tiếng Anh: TopBar, segmented, chip trạng thái không tràn hay xuống dòng xấu ở 390 / 834 / 1280 px.

## Tiêu chí chấp nhận

- [ ] Mở app lần đầu (chưa chọn gì) → tiếng Việt, kể cả khi trình duyệt cài tiếng Anh.
- [ ] **Given** đang ở Cài đặt, **When** chọn "English", **Then** trang tải lại vẫn ở Cài đặt, toàn bộ chữ tiếng Anh, `<html lang="en">`; chọn "Tiếng Việt" quay về như cũ.
- [ ] Ngôn ngữ đã chọn giữ nguyên sau khi tải lại trang hoặc mở tab mới.
- [ ] Ngày, giờ, kg hiển thị đúng bảng định dạng cho từng ngôn ngữ.
- [ ] `en.ts` thiếu key bất kỳ → typecheck đỏ.
- [ ] Không còn chuỗi giao diện tiếng Việt viết cứng ngoài `i18n/vi.ts` (rà bằng grep ký tự có dấu, trừ comment và test).
- [ ] Chuỗi tiếng Anh không làm vỡ bố cục ở 390 / 834 / 1280 px.

## Kiểm thử

- **Unit:** `lib/format.ts` (2 ngôn ngữ, ngày đầu/cuối năm, số âm); `currentLocale` (không có `localStorage` → `vi`, giá trị lạ → `vi`, `en` → `en`).
- **Typecheck:** `en: Messages` đủ key.
- **Thủ công:** đổi ngôn ngữ trong Cài đặt, đi qua các màn chính ở cả 2 ngôn ngữ.

## Ghi chú

- Thông báo lỗi từ server vẫn tiếng Việt cho tới [S4-08](S4-08-i18n-api.md).
- Chuỗi tiếng Anh do Claude dịch; chủ dự án duyệt câu chữ.
