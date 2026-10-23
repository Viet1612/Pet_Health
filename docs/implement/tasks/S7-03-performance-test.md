# S7-03 · Kiểm thử hiệu năng: k6, Lighthouse

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S7 · T15–16 |
| Story | — |
| Yêu cầu | G-6, G-7, G-8, NFR-PERF-001, NFR-PERF-002, NFR-PERF-003, NFR-PERF-005, NFR-PERF-006, SD-011 |
| Phụ thuộc | [S7-01](S7-01-production-stack.md) |
| Ước lượng | 1,5 ngày |
| Màn hình Figma | — |

## Mục tiêu

Chứng minh trên staging, với dữ liệu ở quy mô SD-011, rằng API đạt p95 đọc < 500 ms và ghi < 800 ms ở 50 req/s, việc tạo thông báo khi mở Dashboard không làm vượt ngân sách, Dashboard đạt Core Web Vitals trên mobile 4G và bundle JS ban đầu < 250 KB gzip.

## Phạm vi

**Trong phạm vi:** script seed quy mô lớn, 2 kịch bản k6, đo Lighthouse mobile cho Dashboard, kiểm size-limit, ghi kết quả.

**Ngoài phạm vi:** tối ưu kiến trúc (thêm cache, tách tiến trình) — nếu không đạt thì sửa truy vấn/index trong task này, việc lớn hơn ghi thành bug. Load test production → không làm (production chỉ có dữ liệu thật). Kiểm thử bảo mật → [S7-04](S7-04-security-test.md).

## Chi tiết kỹ thuật

**1. Seed dữ liệu — `apps/api/scripts/seed-scale.ts`**

Chạy bằng `docker compose -p ph-staging run --rm api node dist/scripts/seed-scale.js` trên DB staging đã migrate. Dùng `COPY`/insert theo lô 1.000 dòng, chạy lại được (xóa dữ liệu có email `load+*@test.local` trước khi seed).

| Bảng | Số lượng | Phân bố |
|---|---|---|
| `users` | 1.000 | `load+0001@test.local`…; đã xác minh; múi giờ `Asia/Ho_Chi_Minh`; một mật khẩu chung, băm Argon2id **một lần** rồi dùng lại |
| `pets` | 10.000 | 10 thú cưng mỗi tài khoản |
| `milestones` | 50.000 | 50 mốc mỗi tài khoản: 10 `PENDING` có `dueOn` trong [hôm nay − 3, hôm nay + 7] (sinh D7/D1/Quá hạn), 30 `DONE` trong quá khứ, 10 `PENDING` xa hơn 30 ngày |
| `weights` | 100.000 | 10 lần đo mỗi thú cưng |
| `routines` | 20.000 | 2 việc mỗi thú cưng |
| `visits` | 20.000 | 2 bản ghi mỗi thú cưng, không ảnh |
| `sessions` | 1.000 | 1 phiên mỗi tài khoản; ghi token và `csrfToken` ra `load/sessions.csv` (không commit) |
| `notifications` | 0 | Để kịch bản 2 đo lần tạo đầu tiên |

Thêm 1 tài khoản `load+heavy@test.local` có 10 thú cưng và 100 mốc `PENDING` trong cửa sổ nhắc (đo NFR-PERF-005). Sau seed: `VACUUM ANALYZE`.

**2. Đo thời gian tạo thông báo**

`GET /dashboard` và `GET /notifications/summary` trả header `Server-Timing: notif-sync;dur=<ms>, db;dur=<ms>` (thêm nếu chưa có; chỉ chứa số, không chứa dữ liệu). k6 đọc header này thành metric `notif_sync_ms`.

**3. Cách chạy k6**

Chạy k6 ngay trên máy chủ, vào thẳng mạng Docker của staging để đo ứng dụng, không đo băng thông nhà và tránh WAF/Bot Fight Mode:

```bash
docker run --rm --network ph-staging_edge -v "$PWD/load:/load" \
  -e BASE_URL=http://caddy -e ORIGIN=https://staging.pethealth.example \
  grafana/k6:<phiên bản ghim> run /load/<script>.js --summary-export /load/out/<script>.json
```

Mỗi request gắn cookie `__Host-ph_sid` từ `sessions.csv`, header `CF-Connecting-IP` giả theo VU, request ghi thêm `X-CSRF-Token`, `Origin` và `Idempotency-Key` (UUID mới mỗi lần).

**4. Kịch bản 1 — `load/steady.js` (G-7, NFR-PERF-002, NFR-PERF-006)**

`constant-arrival-rate`, `rate: 50`, `timeUnit: '1s'`, `duration: '10m'`, `preAllocatedVUs: 100`. Mỗi iteration chọn ngẫu nhiên một tài khoản và một request theo tỉ lệ:

| Loại | Request | Tỉ lệ |
|---|---|---|
| đọc | `GET /api/v1/dashboard?pet=all` | 30% |
| đọc | `GET /api/v1/notifications/summary?pet=all` | 15% |
| đọc | `GET /api/v1/pets` | 10% |
| đọc | `GET /api/v1/pets/{id}/milestones` | 10% |
| đọc | `GET /api/v1/pets/{id}/weights` | 5% |
| ghi | `PUT /api/v1/routines/{id}/completion` | 15% |
| ghi | `POST /api/v1/pets/{id}/weights` | 10% |
| ghi | `POST /api/v1/notifications/read` | 5% |

```js
thresholds: {
  'http_req_duration{kind:read}':  ['p(95)<500'],
  'http_req_duration{kind:write}': ['p(95)<800'],
  'http_req_failed': ['rate<0.01'],
  'dropped_iterations': ['count<50'],
}
```

**5. Kịch bản 2 — `load/first-morning.js` (NFR-PERF-005)**

Bảng `notifications` rỗng (chạy ngay sau seed). `constant-arrival-rate`, `rate: 200`, `timeUnit: '1m'`, `duration: '5m'` → 1.000 iteration; iteration thứ `n` dùng tài khoản thứ `n` (`exec.scenario.iterationInTest`) để mỗi tài khoản mở Dashboard lần đầu đúng một lần. Mỗi iteration: `GET /dashboard?pet=all` → `GET /notifications/summary?pet=all` → `GET /notifications?limit=20`.

```js
thresholds: {
  'http_req_duration{name:dashboard}': ['p(95)<500'],
  'notif_sync_ms': ['p(95)<50'],
  'http_req_failed': ['rate<0.01'],
}
```

Sau đó gọi riêng 20 lần `GET /dashboard` bằng `load+heavy` (lần đầu tạo thông báo, các lần sau chỉ đồng bộ): `notif_sync_ms` p95 ≤ 50 ms.

Kiểm sau kịch bản: `SELECT count(*) FROM notifications` = số thông báo kỳ vọng tính từ seed (mỗi mốc trong cửa sổ có đúng 1 thông báo mức hiện tại); chạy lại kịch bản lần 2 → số dòng không đổi (không trùng, G-15).

**6. Lighthouse — Dashboard (G-6, NFR-PERF-001)**

Chạy từ laptop qua `https://staging.pethealth.example` (đường thật qua Cloudflare), tài khoản seed có 3 thú cưng, banner nhắc và checklist:

```bash
npx lighthouse@<phiên bản ghim> https://staging.pethealth.example/ \
  --form-factor=mobile --throttling-method=simulate --only-categories=performance \
  --extra-headers=./load/lh-headers.json --output=json --output=html --output-path=./load/out/lh-dashboard
```

`lh-headers.json` chứa `Cookie`, `CF-Access-Client-Id`, `CF-Access-Client-Secret` (service token Access). Chạy 5 lần, lấy trung vị. INP không đo được ở chế độ navigation: dùng Lighthouse user-flow (chế độ timespan, Puppeteer) bấm chọn thú cưng ở PetSwitcher và tích 1 việc trong checklist; đọc INP từ báo cáo timespan. Bổ sung: sau 1 tuần dùng thật trên staging, truy vấn `analytics_events` tên `web_vitals` lấy p75 LCP, INP, CLS theo `device_class`.

**7. Bundle (G-8, NFR-PERF-003)**

`pnpm --filter web build && pnpm --filter web size-limit` — giới hạn `250 KB` gzip cho JS ban đầu (entry + chunk tải ngay ở route Dashboard). CI đã chặn từ S0-09; ở đây ghi số đo thực tế của bản phát hành.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Seed đủ 1.000 / 10.000 / 50.000 (tài khoản / thú cưng / mốc) trên staging (SD-011).
- [ ] `steady.js`: đọc p95 < 500 ms, ghi p95 < 800 ms, lỗi < 1%, toàn bộ threshold xanh (G-7, NFR-PERF-006).
- [ ] `first-morning.js`: Dashboard p95 < 500 ms; `notif_sync_ms` p95 ≤ 50 ms, kể cả tài khoản 10 thú cưng × 100 mốc (NFR-PERF-005).
- [ ] Chạy `first-morning.js` lần 2 không tạo thêm dòng `notifications`.
- [ ] Lighthouse mobile Dashboard (trung vị 5 lần): LCP < 2,5 s, CLS < 0,1; INP (timespan) < 200 ms (G-6).
- [ ] size-limit < 250 KB gzip (G-8).
- [ ] Trong lúc chạy `steady.js`: không container nào bị khởi động lại, `api` dùng < 512 MB, số kết nối Postgres ≤ 15.

## Kiểm thử

1. Seed → `SELECT count(*)` từng bảng khớp bảng mục 1.
2. Chạy `first-morning.js` trước (cần `notifications` rỗng), rồi `steady.js`.
3. Trong lúc chạy: `docker stats` và `SELECT count(*) FROM pg_stat_activity` mỗi phút.
4. Nếu trượt ngưỡng: lấy 5 request chậm nhất từ log `api` (`durationMs`), chạy `EXPLAIN (ANALYZE, BUFFERS)` truy vấn tương ứng, sửa index/truy vấn, chạy lại toàn bộ kịch bản.
5. Lưu `load/out/*.json` và báo cáo Lighthouse HTML vào `docs/implement/results/S7-03/`, kèm bảng tóm tắt: chỉ số, ngưỡng, kết quả, Pass/Fail.

## Ghi chú

- Sau khi đo xong, xóa dữ liệu `load+*@test.local` khỏi staging để không ảnh hưởng các bài kiểm thử thủ công.
- Kết quả trên staging đại diện cho production vì cùng máy chủ và cùng cấu hình compose; staging không chạy song song tải nào khác trong lúc đo.
