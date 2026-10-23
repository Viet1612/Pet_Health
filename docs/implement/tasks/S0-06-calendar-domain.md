# S0-06 · Hàm thuần lịch và mức nhắc, viết test trước

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — (nền cho US-011, US-041, US-043, US-044, US-047, US-048) |
| Yêu cầu | FR-GEN-001, FR-PET-003, FR-MS-008, FR-MS-009, FR-NTF-001→004, FR-NTF-007, NFR-MNT-002, NFR-MNT-003 (G-2), SAD §2.2.3, SRS §2.5.1, §2.6, §2.10 |
| Phụ thuộc | [S0-01](S0-01-monorepo.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — |

## Mục tiêu
Các quy tắc nghiệp vụ trung tâm (SAD §2.2.3) có ở dạng hàm thuần, không phụ thuộc DB hay HTTP, được kiểm bằng đúng bảng ví dụ của SRS trước khi viết code. Đây là biện pháp chính cho rủi ro R1 (sai logic nhắc nhở).

## Phạm vi
**Trong phạm vi:** `todayIn`, `ageInMonths` + `formatAge`, `addCalendarMonths`, `appearOn`, `dueLevel`, `levelLabel`, `displayStatus` và các hàm ngày phụ trợ; test unit đạt ≥ 90% dòng.

**Ngoài phạm vi:**
- `syncNotifications` (chèn, supersede, `ON CONFLICT`) → S4-03. Tạo mốc kế tiếp → S4-02.
- Hiển thị tuổi trong API `pets` → S2-01.

## Chi tiết kỹ thuật
**Quy trình:** viết toàn bộ test ở mục Kiểm thử trước (đỏ), commit, rồi mới cài đặt (xanh).

1. **Kiểu ngày** (`apps/api/src/platform/calendar/local-date.ts`): `type LocalDate = string & { readonly __brand: 'LocalDate' }` dạng `YYYY-MM-DD`. Hàm: `parseLocalDate(s)` (ném lỗi nếu sai định dạng hoặc ngày không tồn tại, ví dụ `2026-02-30`), `addDays(d, n)`, `diffDays(a, b)` (= a − b, số ngày), so sánh bằng so chuỗi. Dùng Luxon ở zone `UTC` cho phép tính ngày.
2. **`todayIn(tz: string, now: Date): LocalDate`** (`platform/calendar/today.ts`): `DateTime.fromJSDate(now, { zone: tz }).toISODate()`. `tz` không hợp lệ → ném `InvalidTimezoneError`.
3. **`ageInMonths(birth, today): number`** và **`formatAge(months): string`** (`platform/calendar/age.ts`), đúng SRS §2.10.1:
   ```
   tổng_tháng = (T.năm − B.năm) × 12 + (T.tháng − B.tháng); nếu T.ngày < B.ngày thì − 1
   năm = 0 → "{tháng} tháng"; ngược lại "{năm} năm {tháng} tháng"
   ```
   `birth > today` → ném lỗi (đầu vào đã được kiểm ở API).
4. **`addCalendarMonths(date, n): LocalDate`** (`platform/calendar/months.ts`), đúng SRS §2.10.2: chuẩn hóa tháng về 1–12 cộng dồn vào năm, ngày = `min(D.ngày, số ngày của tháng đích)`. `n` là số nguyên ≥ 0, ngược lại ném lỗi.
5. **Mức nhắc** (`apps/api/src/modules/notifications/domain/reminder-level.ts`, dùng chung cho kênh `in_app` và `push` sau này):
   ```ts
   type ReminderLevel = 'D7' | 'D1' | 'OVERDUE';
   type ReminderSubject = { status: 'PENDING' | 'DONE' | 'CANCELLED'; dueOn: LocalDate; dueSetOn: LocalDate };
   appearOn(level, dueOn): LocalDate      // D7 → dueOn − 7; D1 → dueOn − 1; OVERDUE → dueOn + 1
   dueLevel(m, today, overdueEnabled = true): ReminderLevel | null
   levelLabel(level, dueOn, today): string
   ```
   - `dueLevel`: `m.status !== 'PENDING'` → `null`. Ngược lại trả mức **muộn nhất** `L` trong `[OVERDUE, D1, D7]` (bỏ `OVERDUE` nếu `overdueEnabled = false`) thỏa `appearOn(L) ≤ today` **và** `appearOn(L) > m.dueSetOn`; không có → `null` (FR-NTF-001→004).
   - `levelLabel` theo `N = diffDays(dueOn, today)`: `N ≥ 2` → `"còn N ngày"`; `N = 1` → `"ngày mai"`; `N = 0` → `"hôm nay"`; `N < 0` → `"quá hạn |N| ngày"` (FR-NTF-007, bảng SRS §2.6.1).
6. **Trạng thái hiển thị mốc** (`apps/api/src/modules/scheduling/domain/display-status.ts`, SRS §2.5.1):
   `displayStatus(m, today)`: `DONE` → `DONE`; `CANCELLED` → `CANCELLED`; `PENDING` và `dueOn ≥ today` → `UPCOMING`; `PENDING` và `dueOn < today` → `OVERDUE`. Kèm `daysUntilDue(dueOn, today) = diffDays(dueOn, today)` (Dashboard trả `daysUntilDue`, SAD §2.4.4).
7. Các tệp `domain/` chỉ import `platform/calendar` và thư viện chuẩn (luật dependency-cruiser ở [S0-09](S0-09-ci-pipeline.md)). Không hàm nào gọi `new Date()`; "hôm nay" luôn là tham số.

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] 9/9 ca của bảng ví dụ SRS §2.6 Pass với `dueLevel` + `levelLabel` (múi giờ `Asia/Ho_Chi_Minh`).
- [ ] 4/4 ca SRS §2.10.1 và 4/4 ca SRS §2.10.2 Pass.
- [ ] `todayIn` đổi ngày đúng tại 00:00 địa phương ở ít nhất 5 múi giờ, gồm múi giờ có DST.
- [ ] Commit chứa test (đỏ) có trước commit cài đặt.
- [ ] Coverage dòng ≥ 90% cho `platform/calendar/**` và các tệp `domain/` của task này (NFR-MNT-003).
- [ ] Không có import Fastify, Kysely, `pg` trong các tệp trên.

## Kiểm thử
Unit Vitest, viết bằng `it.each` theo bảng.

**`dueLevel` + `levelLabel`** — 9 ca SRS §2.6 (`status = PENDING`):
| # | dueSetOn | dueOn | today | Kỳ vọng |
|---|---|---|---|---|
| 1 | 2026-11-01 | 2026-11-15 | 2026-11-07 | `null` |
| 2 | 2026-11-01 | 2026-11-15 | 2026-11-08 | `D7`, "còn 7 ngày" |
| 3 | 2026-11-01 | 2026-11-15 | 2026-11-11 | `D7`, "còn 4 ngày" |
| 4 | 2026-11-01 | 2026-11-15 | 2026-11-14 (đã có D7) | `D1`, "ngày mai" |
| 5 | 2026-11-01 | 2026-11-15 | 2026-11-14 (lần đầu từ 11-07) | `D1`, "ngày mai" (không trả D7) |
| 6 | 2026-11-11 | 2026-11-15 | 2026-11-11 | `null` |
| 7 | 2026-11-11 | 2026-11-12 | 2026-11-11 | `null` |
| 8 | 2026-11-11 | 2026-11-12 | 2026-11-13 | `OVERDUE`, "quá hạn 1 ngày" |
| 9 | 2026-11-11 | 2026-11-01 | 2026-11-11, 2026-11-20, 2027-01-01 | `null`; `displayStatus` = `OVERDUE` |

Ca 4 và 5 khác nhau ở dữ liệu đã có (D7 chuyển đã xem); hàm thuần trả cùng `D1`, phần supersede kiểm ở S4-03.
Thêm: `status = DONE`/`CANCELLED` → `null`; ca 8 với `overdueEnabled = false` → `null`; `appearOn` cho 3 mức kể cả qua tháng (`dueOn` 2026-03-03 → D7 = 2026-02-24).

**`levelLabel`**: N = 8, 2, 1, 0, −1, −30.

**`displayStatus`**: `dueOn = today` → `UPCOMING`; `dueOn = today − 1` → `OVERDUE`; `DONE`, `CANCELLED`.

**`ageInMonths` + `formatAge`**: 2019-03-15/2026-10-22 → "7 năm 7 tháng"; 2019-03-25/2026-10-22 → "7 năm 6 tháng"; 2026-05-01/2026-10-22 → "5 tháng"; 2026-10-10/2026-10-22 → "0 tháng"; sinh 29/02: 2024-02-29/2025-02-28 → "11 tháng", 2024-02-29/2025-03-01 → "1 năm 0 tháng"; `birth = today` → "0 tháng"; `birth > today` → lỗi.

**`addCalendarMonths`**: 2026-11-14 + 12 → 2027-11-14; 2028-02-29 + 12 → 2029-02-28; 2026-11-14 + 3 → 2027-02-14; 2026-01-31 + 1 → 2026-02-28; qua năm: 2026-12-31 + 2 → 2027-02-28; vào năm nhuận: 2027-11-30 + 3 → 2028-02-29; 2026-01-31 + 60 → 2031-01-31; `n = -1`, `n = 1.5` → lỗi. Thêm 1 test thuộc tính (`fast-check`): với mọi ngày và `n ∈ [1, 60]`, kết quả cách đúng `n` tháng và ngày ≤ ngày gốc.

**`todayIn`**: `Asia/Ho_Chi_Minh` 2026-11-07T16:59:59Z → 2026-11-07, 17:00:00Z → 2026-11-08; `Pacific/Kiritimati` (UTC+14); `Pacific/Pago_Pago` (UTC−11); `Asia/Kathmandu` (UTC+5:45); `America/Los_Angeles` quanh lúc hết DST 2026-11-01; tz `Mars/Base` → lỗi.

## Ghi chú
- Mốc 9 (hạn đã qua lúc tạo) không bao giờ có thông báo nhưng vẫn hiện *Quá hạn* trong danh sách mốc; đừng "sửa" bằng cách nhắc bù (FR-NTF-003).
- SAD §3.2.1 (diễn giải mục 3): truy vấn đồng bộ chỉ xét mốc `due_on ≤ today + 7`; hàm `dueLevel` vẫn phải đúng với mọi `dueOn`.
