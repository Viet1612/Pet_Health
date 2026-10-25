# S6-06 · Job dọn dẹp `maintenance.daily` — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S6-06](../tasks/S6-06-maintenance-job.md) |
| Trạng thái | Xong, test tích hợp (Testcontainers) Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

- **`platform/maintenance/maintenance-daily.job.ts`:** `runMaintenance(deps)` chạy 8 bước theo `STEPS`. Mỗi bước độc lập, idempotent; xóa theo lô 5.000 dòng (`DELETE … WHERE ctid IN (SELECT ctid … LIMIT 5000)`, `SET LOCAL statement_timeout = '30s'`).

  | Bước | Xóa |
  |---|---|
  | `notifications` | `appear_on < hôm nay − 90 ngày` |
  | `idempotency_keys` | `created_at < now − 24 h` |
  | `sessions` | `expires_at < now` |
  | `auth_tokens` | `expires_at < now − 7 ngày` |
  | `rate_limits` | `window_start < now − 24 h` |
  | `uploads` | hơn 1 ngày: chưa READY → xóa tệp `incoming/`, ảnh khám thành `FAILED/ABANDONED`; xóa dòng |
  | `incoming_orphans` | tệp `incoming/` hơn 1 ngày không còn dòng `uploads` |
  | `analytics_partitions` | `analytics_ensure_partitions(2)` + drop partition cũ hơn 12 tháng trước tháng hiện tại |

  Bước lỗi → log `error { job, step, code }`, chạy tiếp; cuối job ném lỗi để pg-boss retry. Mỗi bước log `info { step, deleted, durationMs }`, không log nội dung dòng.
- **Migration `202610261100_maintenance_partitions`:** `analytics_ensure_partitions` thành `SECURITY DEFINER`; thêm `analytics_drop_partitions_before(cutoff)` (cũng `SECURITY DEFINER`). Chỉ `app_worker` được `EXECUTE`, vì worker không phải chủ bảng. Đã chạy trên DB dev.
- **`ObjectStoragePort.list(prefix)`** + `LocalDiskStorage` (tệp ngay dưới thư mục kèm `mtime`).
- **Worker:**
  - `boss.schedule('maintenance.daily', '0 20 * * *', { tz: 'UTC', retryLimit: 3, retryDelay: 600 })` (03:00 giờ VN) + `boss.work`. Đã kiểm: `pgboss.schedule` có đúng 1 dòng.
  - Heartbeat (đã có từ S0) giờ chỉ ghi khi `SELECT 1` qua pool worker thành công.
- **Chạy tay:** `pnpm --filter @ph/api maintenance:run` gửi job ngay (worker đang chạy sẽ xử lý).

## Tiêu chí chấp nhận

Đã kiểm bằng `test/maintenance.int.test.ts` (PostgreSQL 16 qua Testcontainers, `FakeClock` 14/11/2026 20:00 UTC, thư mục media tạm):
- **Biên lưu giữ:** thông báo −91 ngày xóa, −89 giữ; idempotency 25 h xóa, 23 h giữ; phiên hết hạn xóa, còn hạn giữ; token hết hạn 8 ngày xóa, 6 ngày giữ; rate limit 25 h xóa, 1 h giữ.
- **Upload:** PROCESSING 25 h → tệp `incoming/` xóa, ảnh khám `FAILED/ABANDONED`; upload 2 h không đụng.
- **Tệp mồ côi:** 2 ngày → xóa; 1 giờ → giữ.
- **Partition:** `analytics_events_202501` bị drop; vẫn đủ partition tháng này + 2 tháng tới.
- **Chạy lần 2:** mọi bước xóa 0, không lỗi.

Ngoài ra: unit 198, IDOR 97/97, db.int 6/6, E2E 48/48 (worker E2E khởi động với lịch cron, không lỗi), typecheck, lint.

## Khác với file task

- **Vị trí:** gộp `steps.ts` vào `maintenance-daily.job.ts`.
- **Partition mới tạo theo giờ thật của DB** (`now()` trong hàm SQL), không theo `FakeClock`. Test kiểm số partition, không kiểm tên tháng cụ thể.
- **Healthcheck compose:** `compose.dev.yml` profile `full` đã có healthcheck worker từ S0-10 (lệnh `healthcheck-worker` của entrypoint), nên không sửa. Không có `compose.staging.yml` (không dựng staging).
- **Chưa test:**
  - Lô 12.000 thông báo.
  - Một bước lỗi không chặn bước khác (đã có `try/catch` từng bước).
  - Container chuyển `unhealthy` khi treo.
