# F-01 · Lưu ảnh lên Cloudflare R2 qua `ObjectStoragePort`

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [S7-01](../tasks/S7-01-production-stack.md) |
| Ước lượng | 1 ngày |

## Mục tiêu

Ảnh (avatar, ảnh khám, ảnh bài đăng) lưu trên Cloudflare R2 thay vì đĩa máy chủ, để dung lượng không phụ thuộc ổ cứng và chịu được lượng ảnh của bản tin. Không đổi API nào phía client.

## Phạm vi

**Trong phạm vi:** adapter `R2Storage implements ObjectStoragePort` (API tương thích S3); cấu hình chọn adapter bằng biến môi trường; script chép dữ liệu từ đĩa lên R2; test hợp đồng chung cho 2 adapter.

**Ngoài phạm vi:** đổi cách phát ảnh cho client. `/media/*` vẫn đi qua API (URL ký 15 phút, `Cache-Control: private`), API đọc từ R2 rồi stream về. Không dùng URL công khai của R2, vì ảnh sức khỏe là dữ liệu riêng.

## Chi tiết kỹ thuật

1. **Thư viện:** `@aws-sdk/client-s3` (endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`).
2. **`platform/storage/r2-storage.ts`:** cài đủ các hàm của port:
   - `writeStream` dùng multipart upload, dừng khi vượt `maxBytes`.
   - `readStream`, `read`, `readHead` (Range).
   - `put`, `delete` (bỏ qua NoSuchKey).
   - `deletePrefix` (ListObjectsV2 + DeleteObjects theo lô 1.000).
   - `list` (S6-06; `LastModified` → `modifiedAt`).
3. **Cấu hình** (`config.ts`): `STORAGE_DRIVER=disk|r2` (mặc định `disk`), `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Khóa nằm trong `secrets/*.env` của server, không vào repo.
4. **`incoming/`** vẫn ghi lên đĩa tạm của container (nhanh, worker đọc ngay); worker xử lý xong ghi bản cuối lên R2. Bước 7 của `maintenance.daily` vẫn chạy trên đĩa.
5. **Script `scripts/migrate-media-to-r2.ts`:** duyệt `MEDIA_ROOT/u/**`, upload nếu chưa có (so `ETag`/kích thước), in số tệp đã chép. Chạy được nhiều lần.
6. **Bucket R2:** tạo ở Cloudflare dashboard, **không bật public access**, token chỉ có quyền Object Read & Write trên bucket đó.

## Tiêu chí chấp nhận

- [ ] Với `STORAGE_DRIVER=r2`: tải avatar, ảnh khám lên → tệp nằm trong bucket đúng khóa `u/{userId}/p/{petId}/…`; xem ảnh qua `/media/*` hoạt động như cũ.
- [ ] Xóa thú cưng / tài khoản → `media.purge-prefix` xóa hết object dưới prefix trên R2.
- [ ] Bucket không đọc được khi không có chữ ký (truy cập trực tiếp trả 403).
- [ ] Script chép dữ liệu cũ chạy 2 lần: lần 2 chép 0 tệp.

## Kiểm thử

- **Hợp đồng adapter:** cùng một bộ test chạy với `LocalDiskStorage` và `R2Storage` (R2 thật trong bucket test, hoặc MinIO/`s3rver` nếu kéo được image).
- **E2E:** chạy bộ E2E hiện có với `STORAGE_DRIVER=r2` trên môi trường staging hoặc máy dev có mạng.

## Ghi chú

- Gói miễn phí R2: 10 GB lưu trữ, 1 triệu thao tác ghi, 10 triệu thao tác đọc mỗi tháng; không tính phí băng thông ra.
