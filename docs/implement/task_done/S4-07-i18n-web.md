# S4-07 · Hạ tầng đa ngôn ngữ web và bản tiếng Anh — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-07](../tasks/S4-07-i18n-web.md) |
| Trạng thái | Xong (code), E2E giao diện tiếng Việt vẫn Pass; chưa bấm thử bản tiếng Anh |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **`i18n/`:**
  - `vi.ts`: thêm `export type Messages` (chuỗi literal → `string`, hàm giữ chữ ký). Thêm nhóm `settings`, `password`, `error.serverToastRef`.
  - `en.ts`: `export const en: Messages`, đủ key (thiếu/thừa là lỗi typecheck). Số ít/số nhiều qua helper `plural` ("1 photo" / "2 photos").
  - `locale.ts`: `SUPPORTED = ['vi','en']`, `currentLocale()` (`localStorage['ph.locale']` hợp lệ, ngược lại `vi`; không đoán theo trình duyệt), `setLocale()` lưu rồi `location.reload()`, `consumeLocaleChanged()` để hiện toast sau khi tải lại.
  - `index.ts`: `locale`, `m` chọn một lần lúc khởi động.
- **Đổi hàng loạt** 66 file `import { vi } from '…/i18n/vi'` → `import { m } from '…/i18n'`. Biến cục bộ tên `m` bị che đã đổi tên (`msg` cho `toUserMessage`, `milestone` ở `MilestoneDetail`).
- **`lib/format.ts`:** `formatDate`, `formatDayMonth`, `formatMonthYear`, `formatMonthShort` (trục biểu đồ: `T9` / `Sep`), `formatDateTime`, `formatDecimal1`, `formatKg`, `formatSignedTenths`. Ngày `YYYY-MM-DD` định dạng với `timeZone: 'UTC'`. Các `features/*/format.ts` re-export từ đây (giữ tên cũ như `formatVisitDate`, `formatLocalDate` để không đổi chỗ gọi).
- **Chuỗi viết cứng còn sót** đã đưa vào từ điển: nút "Hiện/Ẩn" mật khẩu, "Mã: …" trong toast lỗi server.
- **`main.tsx`:** `document.documentElement.lang = locale` trước khi render.
- **Cài đặt (`/settings`):** tiêu đề "Cài đặt" + thẻ "Ngôn ngữ / Language" với 2 radio 44 px "Tiếng Việt", "English" (nhãn viết bằng chính ngôn ngữ đó, có `lang`). Chọn khác → lưu + tải lại, toast "Đã đổi ngôn ngữ" / "Language changed".
- **Menu ☰ trên phone:** thêm mục "Cài đặt" phía trên "Đăng xuất".
- **Test:** `lib/format.test.ts` (2 ngôn ngữ, đầu/cuối năm, số âm, múi giờ); `i18n/locale.test.ts` (`currentLocale` các ca mặc định/lạ/lỗi, `en` đủ key như `vi`, số nhiều).
- **Bundle:** JS ban đầu 129,6 KB gzip (cả 2 từ điển nằm trong bundle đầu).

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck (gồm `en: Messages`), lint, depcruise, build, size-limit, unit test web 27, E2E giao diện phone + tablet (tiếng Việt) Pass. Rà grep ký tự có dấu: chỉ còn dấu `·` ghép tên/ghi chú do người dùng nhập.

**Chưa kiểm** (cần bấm thử): đổi sang English trong Cài đặt, đi qua các màn ở tiếng Anh, bố cục chuỗi tiếng Anh ở 390 / 834 / 1280 px.

## Khác với file task

- Giữ các hàm định dạng trong `features/*/format.ts` dưới dạng re-export thay vì sửa mọi chỗ gọi.
- Chữ do API trả (tuổi `ageText`, nhãn "còn 7 ngày" của thông báo, thông báo lỗi) vẫn tiếng Việt cho tới S4-08.
