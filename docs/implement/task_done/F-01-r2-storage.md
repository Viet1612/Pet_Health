# F-01 · Lưu ảnh lên Cloudflare R2 — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-01](../tasks-feed/F-01-r2-storage.md) |
| Trạng thái | Xong, đang dùng trên production (bucket `pethealth-media`) |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

- **`platform/storage/r2-storage.ts`:** `R2Storage implements ObjectStoragePort` dùng `@aws-sdk/client-s3`:
  - Kết nối: endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`.
  - Đọc / ghi:
    - Ghi: `put` (đặt `ContentType` theo đuôi tệp). `writeStream` đọc vào bộ nhớ có giới hạn `maxBytes` (ảnh ≤ 5 MB), rồi `put`.
    - Đọc: `readStream`, `read`, `readHead` (Range).
  - Xóa: `delete` bỏ qua `NoSuchKey`; `deletePrefix` duyệt `ListObjectsV2` + `DeleteObjects` theo lô 1.000.
  - Liệt kê: `list` với `Delimiter: '/'`.
- **`platform/storage/create-storage.ts`:**
  - `HybridStorage`: khóa `incoming/…` (ảnh vừa nhận, worker đọc ngay) ở đĩa; mọi khóa khác ở R2. Code nghiệp vụ không đổi.
  - `createStorage(config)`: chọn kho theo `STORAGE_DRIVER=disk|r2`, mặc định `disk` trên máy dev.
- **Cấu hình:**
  - `STORAGE_DRIVER`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
  - `r2` thiếu một trong bốn giá trị R2 → báo lỗi cấu hình khi khởi động.
- **Bucket và quyền:**
  - Bucket **không public**. Client vẫn xem ảnh qua `/media/*` (URL ký 15 phút), API đọc từ R2 rồi stream về.
  - Khóa R2 là **Account API token**, quyền Object Read & Write, chỉ trên bucket `pethealth-media`.

## Tiêu chí chấp nhận

- **Đã kiểm trên production:** up ảnh đại diện hồ sơ → worker ghi bản cuối lên R2 → `READY`; `/media` trả ảnh 200.
- **Chưa kiểm:**
  - Xóa tài khoản → purge prefix trên R2.
  - Truy cập trực tiếp bucket không chữ ký → 403. Bucket không public nên mặc định đã vậy.
  - Script chép ảnh cũ từ đĩa lên R2 (`migrate-media-to-r2.ts`): chưa làm, vì production mới nên không có ảnh cũ trên đĩa.
- **Test tự động:** chưa có test riêng cho `R2Storage`, vì cần bucket thật. Bộ test hiện có chạy với `disk`.
