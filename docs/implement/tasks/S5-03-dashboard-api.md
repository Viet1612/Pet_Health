# S5-03 · `GET /dashboard`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S5 · T11–12 |
| Story | US-047, US-051, US-060, US-061, US-062 |
| Yêu cầu | FR-DSH-001→007, FR-NTF-009, FR-NTF-010, FR-RT-002, NFR-PERF-001, NFR-PERF-002 |
| Phụ thuộc | [S5-01](S5-01-routines-api.md), [S4-03](S4-03-notifications-api.md), [S3-01](S3-01-weights-api.md) |
| Ước lượng | 1,5 ngày |
| Màn hình Figma | — |

## Mục tiêu

Một endpoint chỉ đọc trả đủ dữ liệu để render Dashboard trong **đúng 1 request**: banner nhắc, số chưa xem, danh sách thú cưng, checklist hôm nay, tối đa 5 mốc sắp tới và tóm tắt cân nặng, có lọc theo thú cưng. Mục tiêu p95 < 150 ms ở quy mô SD-011.

## Phạm vi

**Trong phạm vi:** mô-đun `dashboard` (chỉ đọc qua query port); `GET /dashboard?pet=all|{petId}`; query port còn thiếu ở `scheduling`, `health-records`, `pets`; schema Zod `DashboardView` trong `openapi.yaml`; test tích hợp, IDOR, đo thời gian.

**Ngoài phạm vi:** giao diện SCR-06 ([S5-04](S5-04-dashboard-ui.md)); logic `syncNotifications` và banner ([S4-03](S4-03-notifications-api.md), chỉ gọi lại); `POST /auth/verify-email/resend` ([S1-05](S1-05-verify-email-api.md)); load test k6 đầy đủ ([S7-03](S7-03-performance-test.md)).

## Chi tiết kỹ thuật

**Vị trí code:** `apps/api/src/modules/dashboard/{application/get-dashboard.ts, adapters/http/dashboard.route.ts}`. Mô-đun **không có bảng** và không đọc bảng của mô-đun khác; chỉ dùng port (SAD §2.2.2):

| Port | Mô-đun cung cấp | Hàm |
|---|---|---|
| `PetQueryPort` | `pets` | `listForOwner(ownerId) → { id, name, avatarThumbUrl, weightTargetKg }[]` (thứ tự như `GET /pets`) |
| `NotificationSyncPort` | `notifications` | `syncIfNeeded(ownerId, today)` (S4-03) |
| `NotificationQueryPort` | `notifications` | `summary(ownerId, today, petIds) → { unreadCount, banner }` (cùng hàm của `GET /notifications/summary`) |
| `RoutineQueryPort` | `routines` | `checklistForToday(ownerId, petIds, today)` (S5-01) |
| `MilestoneQueryPort` | `scheduling` | `upcomingForDashboard(ownerId, petIds, today, limit=5)` — **thêm mới** |
| `WeightQueryPort` | `health-records` | `summaryForDashboard(petId, today)` — **thêm mới** |

**Input:** `pet` = `"all"` hoặc UUID; thiếu → `"all"`. Sai định dạng → `422 VALIDATION_FAILED`. UUID không thuộc user → `404 NOT_FOUND`.

**Các bước xử lý** (trong `get-dashboard.ts`):

1. `today = todayIn(user.timezone, clock.now())`; `account.emailVerified = user.emailVerifiedAt != null` (lấy từ phiên, không truy vấn thêm).
2. `pets = PetQueryPort.listForOwner(ownerId)`. Nếu `pet ≠ all` mà không có trong `pets` → `404`. `scopePetIds = pet === 'all' ? pets.map(id) : [pet]`. `weightPetId = pet === 'all' ? pets[0]?.id : pet`.
3. Nếu `pets.length === 0`: trả ngay `notifications { unreadCount: 0, banner: null }`, `routines { 0, 0, [] }`, `upcomingMilestones: []`, `weight: null` (bỏ qua bước 4–5).
4. `await NotificationSyncPort.syncIfNeeded(ownerId, today)` — **chạy trước**, tuần tự; bỏ qua khi `notifications_synced_on = today` (SAD §3.2.1).
5. `Promise.all` 4 truy vấn đọc: `summary`, `checklistForToday`, `upcomingForDashboard`, `summaryForDashboard(weightPetId)`. Mỗi truy vấn dùng một kết nối từ pool trong transaction đọc ngắn có `set_config('app.user_id', $1, true)` (RLS). Pool `api` = 10 kết nối, nên 1 request chiếm tối đa 4.
6. Ghép `petName` từ map `pets` cho mọi mục; trả `200` với `Cache-Control: no-store`.

**`upcomingForDashboard`** (FR-DSH-003): một câu `SELECT` dùng partial index `(owner_id, due_on) WHERE status='PENDING'`:

```sql
SELECT id, pet_id, type, note, due_on FROM milestones
WHERE owner_id = $1 AND status = 'PENDING' AND pet_id = ANY($2)
  AND due_on <= $today::date + 30
ORDER BY due_on ASC, created_at ASC, id ASC
LIMIT 5;
```

Mốc quá hạn có `due_on < today` nên tự đứng trước. `displayStatus`, `daysUntilDue = due_on − today` tính bằng hàm của [S0-06](S0-06-calendar-domain.md), giống `MilestoneView` ở S4-01.

**`summaryForDashboard`**: `target` = `pets.weight_target_kg` (qua `PetQueryPort`, đã có ở bước 2); `latest` = số đo mới nhất (`measured_on DESC, created_at DESC`), `delta` = latest − số đo liền trước (null nếu chỉ 1 số đo); `series` = các số đo có `measured_on ≥ today − 6 tháng`, tăng dần theo ngày. Dùng lại truy vấn của [S3-01](S3-01-weights-api.md).

**Output `DashboardView`** (đúng SAD §2.4.4):

```json
{
  "today": "2026-11-14",
  "account": { "emailVerified": false },
  "notifications": { "unreadCount": 2, "banner": {
    "top": { "id": "…", "level": "D1", "label": "ngày mai", "milestoneId": "…",
             "petName": "Mochi", "type": "VACCINE", "note": "Dại", "dueOn": "2026-11-15" },
    "moreCount": 1, "notificationIds": ["…", "…"] } },
  "pets": [{ "id": "…", "name": "Mochi", "avatarThumbUrl": "/media/…" }],
  "routines": { "doneCount": 2, "totalCount": 4, "items": [
    { "id": "…", "petName": "Mochi", "name": "Cho ăn sáng", "timeOfDay": "07:00", "done": true } ] },
  "upcomingMilestones": [
    { "id": "…", "petName": "Mochi", "type": "DEWORM", "note": null, "dueOn": "2026-11-12",
      "displayStatus": "OVERDUE", "daysUntilDue": -2 } ],
  "weight": { "petId": "…", "target": "9.0",
              "latest": { "measuredOn": "2026-11-01", "weightKg": "9.3", "delta": "0.3" },
              "series": [{ "measuredOn": "2026-06-01", "weightKg": "8.6" }] }
}
```

- `banner` = `null` khi `unreadCount = 0` trong phạm vi lọc. `top` chọn `OVERDUE > D1 > D7`, cùng mức thì `dueOn` sớm hơn (FR-NTF-009); `moreCount = unreadCount − 1`; `label` theo SRS §2.6.1 ("còn N ngày", "ngày mai", "hôm nay", "quá hạn N ngày"). Thông báo đã xử lý không lên banner.
- `unreadCount` và banner **chỉ tính thông báo của mốc thuộc `scopePetIds`** (US-061).
- `routines.items` sắp `done ASC, timeOfDay ASC`; `doneCount`/`totalCount` trên toàn phạm vi.
- `weight.latest` = `null` khi chưa có số đo; `weight.target` = `null` khi chưa đặt mục tiêu.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] `GET /dashboard` thực hiện đồng bộ thông báo trước, sau đó đúng 4 truy vấn đọc song song; lần gọi thứ hai trong ngày không chạy lại sync.
- [ ] US-062: banner trả nhắc khẩn cấp nhất (Quá hạn > D1 > D7; cùng mức hạn sớm hơn trước) và `moreCount`; không có nhắc chưa xem → `banner: null`.
- [ ] US-061: `?pet={id}` chỉ trả việc, mốc, banner, `unreadCount` của thú cưng đó; `?pet=all` gộp mọi thú cưng, mỗi mục có `petName`.
- [ ] US-047 / FR-DSH-003: tối đa 5 mốc `PENDING`, quá hạn trước, rồi trong 30 ngày tới, cùng nhóm theo ngày hạn tăng dần; mốc ngày `today + 31` không xuất hiện.
- [ ] US-051: checklist theo giờ tăng dần, việc xong cuối, đúng `doneCount/totalCount`.
- [ ] US-060: tài khoản không có thú cưng → `pets: []`, các phần rỗng, `weight: null`, không lỗi.
- [ ] FR-DSH-007: `account.emailVerified` phản ánh `users.email_verified_at`.
- [ ] `pet` sai định dạng → `422`; ID thú cưng của người khác → `404`.
- [ ] p95 < 150 ms trên dữ liệu seed SD-011 (đo ở integration bench), API đọc p95 < 500 ms (NFR-PERF-002).

## Kiểm thử

- **Unit** (`get-dashboard.ts` với port giả): thứ tự gọi (sync trước, 4 port song song); `pets = []` không gọi port nào khác; `pet=all` dùng `pets[0]` cho cân nặng.
- **Integration** (Testcontainers + `FakeClock`, ngày 2026-11-14):
  - Mốc: 6 mốc quá hạn → trả 5 mốc quá hạn sớm nhất; mốc `due_on` = 2026-12-14 (+30) có, 2026-12-15 (+31) không; mốc `DONE`/`CANCELLED` không có.
  - Banner: OVERDUE + D1 + D7 → `top.level = OVERDUE`, `moreCount = 2`; 2 mốc OVERDUE hạn 10/11 và 12/11 → `top.dueOn = 2026-11-10`; đóng hết (`read_at` set) → `banner: null`.
  - Lọc: 2 thú cưng Mochi, Bơ; `?pet=<Bơ>` không chứa mục nào của Mochi, kể cả trong `unreadCount`.
  - Checklist qua nửa đêm: tick lúc 23:50 local, gọi lúc 00:01 → `done:false`.
  - Cân nặng: 0 số đo → `latest: null`, `series: []`; 1 số đo → `delta: null`; số đo 7 tháng trước không có trong `series`.
  - Đồng bộ: mốc tạo ngày 01/11 hạn 15/11, gọi dashboard ngày 08/11 lần đầu → có D7 trong banner (luồng SAD §3.2.1); gọi lần 2 không có câu `INSERT notifications`.
- **IDOR:** `GET /dashboard?pet=<petId của user khác>` → `404`; thêm vào suite [S1-08](S1-08-idor-suite.md) dạng query parameter.
- **Hiệu năng:** script seed SD-011 (1.000 tài khoản, 10.000 thú cưng, 50.000 mốc) + `autocannon` 200 request cho 1 tài khoản có 10 thú cưng, 20 mốc, 40 việc → ghi p95 vào PR. `EXPLAIN` truy vấn mốc dùng partial index.

## Ghi chú

- `banner.notificationIds` (≤ 50 ID thông báo chưa xem trong phạm vi, `top.id` đứng đầu) là trường **bổ sung** vào §2.4.4, cùng tên và thứ tự sắp với `GET /notifications/summary` của S4-03, để client đóng banner đánh dấu đúng "các thông báo đang được banner tóm tắt" (FR-NTF-009). Thêm có tương thích vì client bỏ qua trường lạ (SAD §2.4.1).
- `note` trong `upcomingMilestones` lấy theo view model `MilestoneRow` (Blueprint §3.4.2) để hiện "Tiêm vaccine · Dại".
- Khi lọc "Tất cả", cân nặng là của thú cưng đầu tiên trong `pets` (Blueprint §3.5.2); client hiện kèm tên.
