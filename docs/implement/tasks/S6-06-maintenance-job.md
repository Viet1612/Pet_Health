# S6-06 · Job dọn dẹp `maintenance.daily`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S6 · T13–14 |
| Story | — |
| Yêu cầu | FR-NTF-011, FR-GEN-005, FR-AUTH-012, SD-013, NFR-REL-001 |
| Phụ thuộc | [S4-03](S4-03-notifications-api.md) |
| Ước lượng | 0,5 |
| Màn hình Figma | — |

## Mục tiêu

Một job pg-boss chạy mỗi đêm xóa dữ liệu hết hạn theo chính sách lưu giữ SAD §2.3, và worker có heartbeat để Docker healthcheck phát hiện khi treo.

## Phạm vi

**Trong phạm vi:** handler `maintenance.daily` + lịch cron; 8 bước dọn dẹp; quản lý partition `analytics_events`; heartbeat `/tmp/alive` và healthcheck `worker` trong `compose.dev.yml`, `compose.staging.yml`.

**Ngoài phạm vi:** `autoheal` và compose production ([S7-01](S7-01-production-stack.md)); xóa thư mục ảnh khi xóa thú cưng/tài khoản (`media.purge-prefix`, [S2-02](S2-02-media-pipeline.md)); bảng và hàm partition ([S6-05](S6-05-analytics.md)).

## Chi tiết kỹ thuật

Mã đặt tại `apps/api/src/platform/maintenance/` (`maintenance-daily.job.ts`, `steps.ts`), đăng ký trong `src/main-worker.ts`. Chạy bằng role `app_worker` (`BYPASSRLS`), lấy "bây giờ" từ `ClockPort`.

**1. Lịch**

```ts
await boss.createQueue('maintenance.daily');
await boss.schedule('maintenance.daily', '0 20 * * *', null, { tz: 'UTC', retryLimit: 3, retryDelay: 600 });
await boss.work('maintenance.daily', { batchSize: 1 }, runMaintenance);
```
`0 20 * * *` UTC = 03:00 giờ Việt Nam. pg-boss bảo đảm một lần chạy cho mỗi mốc cron dù có nhiều worker.

**2. Các bước** — mỗi bước độc lập, idempotent, xóa theo lô 5.000 dòng (`DELETE ... WHERE ctid IN (SELECT ctid ... LIMIT 5000)`) lặp tới khi 0 dòng, `SET LOCAL statement_timeout = '30s'` mỗi lô. `now`, `today` = thời điểm/ngày UTC từ `ClockPort`.

| # | Bước | Điều kiện xóa |
|---|---|---|
| 1 | `notifications` | `appear_on < today − 90 ngày` (FR-NTF-011, SD-013) |
| 2 | `idempotency_keys` | `created_at < now − 24 h` |
| 3 | `sessions` | `expires_at < now` |
| 4 | `auth_tokens` | `expires_at < now − 7 ngày` |
| 5 | `rate_limits` | `window_start < now − 24 h` (cửa sổ dài nhất là 1 giờ) |
| 6 | `uploads` bỏ dở | `created_at < now − 1 ngày`: nếu chưa `READY` thì xóa tệp `incoming/{uploadId}` (bỏ qua `ENOENT`) và chuyển `visit_photos` liên quan sang `FAILED`, `fail_reason = 'ABANDONED'`; xóa dòng `uploads` |
| 7 | Tệp mồ côi `incoming/` | Tệp có `mtime < now − 1 ngày` và không còn dòng `uploads` tương ứng |
| 8 | Partition analytics | Gọi `analytics_ensure_partitions(2)`; `DROP TABLE` mọi partition `analytics_events_YYYYMM` có tháng < tháng hiện tại − 12 (giữ 13 tháng kể cả tháng hiện tại) |

**3. Xử lý lỗi và log**
- Bước lỗi → log `error` `{ job: 'maintenance.daily', step, err.code }`, chạy tiếp bước sau; cuối job nếu có bước lỗi thì ném lỗi để pg-boss retry (các bước đã xong chạy lại không gây hại).
- Mỗi bước log `info` `{ job, step, deleted, durationMs }`. Không log nội dung dòng.
- Lỡ một đêm không ảnh hưởng chức năng: danh sách thông báo đã lọc 90 ngày khi đọc, idempotency kiểm `created_at` khi đọc, phiên kiểm `expires_at` khi xác thực.

**4. Heartbeat worker** (SAD §4.2.2)
- `main-worker.ts`: `setInterval` 30 s → chạy `SELECT 1` qua pool worker và kiểm `boss` chưa dừng; thành công thì `fs.writeFile('/tmp/alive', String(Date.now()))`. Ghi ngay một lần khi khởi động xong.
- Dừng interval trong graceful shutdown.
- Compose (`worker`):

```yaml
tmpfs: [/tmp]
healthcheck:
  test: ["CMD-SHELL", "test $$(( $$(date +%s) - $$(stat -c %Y /tmp/alive) )) -lt 90"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 30s
```

**5. Chạy tay:** script `pnpm --filter api maintenance:run` gửi job `maintenance.daily` ngay (dùng khi kiểm staging).

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Job được lịch `0 20 * * *` UTC; bảng `pgboss.schedule` có đúng 1 dòng `maintenance.daily`.
- [ ] **Given** thông báo có `appear_on` = hôm nay − 91 và − 89 ngày, **When** job chạy, **Then** dòng − 91 bị xóa, dòng − 89 còn.
- [ ] `idempotency_keys` > 24 h, `sessions` hết hạn, `auth_tokens` hết hạn > 7 ngày, `rate_limits` > 24 h bị xóa; bản ghi còn hạn giữ nguyên.
- [ ] Upload `PROCESSING` tạo 25 h trước: tệp `incoming/` bị xóa, ảnh khám chuyển `FAILED`; upload tạo 2 h trước không bị đụng.
- [ ] Sau job luôn có partition cho tháng hiện tại và 2 tháng tới; partition cũ hơn 13 tháng bị drop.
- [ ] Chạy job 2 lần liên tiếp: lần 2 xóa 0 dòng, không lỗi.
- [ ] Một bước lỗi không chặn các bước còn lại; job được retry tối đa 3 lần.
- [ ] Worker treo (giả lập dừng event loop hoặc DB ngắt) → sau ≤ 90 s + 3 lần kiểm, container chuyển `unhealthy`.

## Kiểm thử

- **Integration (Testcontainers + `FakeClock`):** seed dữ liệu ở 2 phía mỗi biên (90/91 ngày, 23/25 giờ, 6/8 ngày); gọi `runMaintenance()` trực tiếp; kiểm số dòng còn lại từng bảng. Thêm ca 12.000 thông báo hết hạn để kiểm vòng lặp theo lô.
- **Partition:** đặt `FakeClock` sang tháng 14 sau tháng tạo bảng, chạy job, kiểm `pg_inherits` chỉ còn 13 tháng + 2 tháng tới.
- **Tệp:** thư mục `media/` tạm; tạo tệp `incoming/` có/không dòng `uploads`, đặt `mtime` bằng `fs.utimes`.
- **Heartbeat:** test đơn vị với fake timers kiểm ghi tệp mỗi 30 s và không ghi khi `SELECT 1` lỗi; thủ công `docker compose -f compose.staging.yml pause`/`kill -STOP` tiến trình worker và quan sát `docker inspect --format '{{.State.Health.Status}}'`.

## Ghi chú

- RLS không áp cho `app_worker`; mọi câu `DELETE` trong job chỉ lọc theo thời gian, không lọc theo người dùng, nên không cần `set_config('app.user_id')`.
- `uploads.status` dùng đúng giá trị đã định ở [S2-02](S2-02-media-pipeline.md); "chưa READY" bao gồm mọi trạng thái trung gian và `FAILED`.
