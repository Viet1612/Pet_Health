# S0-06 · Hàm thuần lịch và mức nhắc — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-06](../tasks/S0-06-calendar-domain.md) |
| Trạng thái | Xong |
| Ngày hoàn thành | 2026-10-23 |
| Commit | `35b1779` |

## Kết quả

Các quy tắc nghiệp vụ trung tâm (SAD §2.2.3) ở dạng hàm thuần, không phụ thuộc DB hay HTTP:

| Hàm | Tệp | Nội dung |
|---|---|---|
| `LocalDate`, `parseLocalDate`, `addDays`, `diffDays` | `platform/calendar/local-date.ts` | Ngày lịch `YYYY-MM-DD`; từ chối ngày không tồn tại |
| `todayIn(tz, now)` | `platform/calendar/today.ts` | "Hôm nay" theo múi giờ IANA; múi giờ sai → `InvalidTimezoneError` |
| `ageInMonths`, `formatAge` | `platform/calendar/age.ts` | SRS §2.10.1 |
| `addCalendarMonths` | `platform/calendar/months.ts` | SRS §2.10.2 (29/02 → 28/02) |
| `appearOn`, `dueLevel`, `levelLabel` | `modules/notifications/domain/reminder-level.ts` | Mức nhắc D7 / D1 / Quá hạn, không nhắc bù |
| `displayStatus`, `daysUntilDue` | `modules/scheduling/domain/display-status.ts` | SRS §2.5.1 |

46 test trong `test/calendar.test.ts` đều qua.

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| 9/9 ca SRS §2.6 với `dueLevel` + `levelLabel` | Đạt |
| Các ca SRS §2.10.1 và §2.10.2 | Đạt: 7 ca tuổi, 7 ca cộng tháng, kèm ca lỗi |
| `todayIn` đổi ngày đúng 00:00 địa phương ở ≥ 5 múi giờ, có DST | Đạt: Hồ Chí Minh, Kiritimati (+14), Pago Pago (−11), Kathmandu (+5:45), Los Angeles quanh lúc hết DST |
| Commit test (đỏ) trước commit cài đặt | **Không làm**: theo yêu cầu "cứ code đi", test và code vào cùng một commit |
| Coverage ≥ 90% cho calendar và domain | Chưa đo |
| Không import Fastify, Kysely, `pg` trong các tệp trên | Đạt |

## Tệp đã tạo

- `apps/api/src/platform/calendar/`: `local-date.ts`, `today.ts`, `age.ts`, `months.ts`
- `apps/api/src/modules/notifications/domain/reminder-level.ts`
- `apps/api/src/modules/scheduling/domain/display-status.ts`
- `apps/api/test/calendar.test.ts`
- Dependency: `luxon`, `@types/luxon` (dev)

## Khác với file task

- Không có test thuộc tính bằng `fast-check`.
- Không có quy trình hai commit (test đỏ trước, code sau).
