# S7-04 · Kiểm thử bảo mật: ZAP, IDOR, dependency

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S7 · T15–16 |
| Story | US-006 |
| Yêu cầu | G-9, G-10, G-11, G-12, NFR-SEC-001→011 |
| Phụ thuộc | [S7-01](S7-01-production-stack.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

Xác nhận trước ra mắt: không còn lỗ hổng High/Critical (OWASP ZAP và quét dependency), 100% ca IDOR Pass, ảnh chỉ truy cập được qua URL ký ≤ 15 phút và không bị Cloudflare cache, cookie/băm mật khẩu/HTTPS đúng thiết kế, lịch sử git không chứa bí mật.

## Phạm vi

**Trong phạm vi:** ZAP baseline + API scan trên staging, chạy lại IDOR suite, kiểm thủ công URL ký và cache, kiểm G-10, `pnpm audit`, OSV-Scanner, gitleaks toàn lịch sử, kiểm log và bundle không lộ dữ liệu, kiểm host không mở cổng.

**Ngoài phạm vi:** pentest thủ công chuyên sâu. Cấu hình Cloudflare → [S7-02](S7-02-cloudflare-email.md). Contract test → [S7-05](S7-05-contract-device-test.md).

## Chi tiết kỹ thuật

**1. Chuẩn bị**

- Staging chạy đúng SHA sẽ phát hành. Hai tài khoản thử: `A` (có 2 thú cưng, mốc, bản ghi khám có 2 ảnh, cân nặng, việc hằng ngày) và `B` (1 thú cưng).
- Service token Cloudflare Access cho staging: `CF_ID`, `CF_SECRET`. Cookie phiên và `csrfToken` của `A` lấy từ `POST /api/v1/auth/login`.
- Kết quả lưu ở `docs/implement/results/S7-04/`.

**2. OWASP ZAP**

```bash
# Baseline (thụ động, qua Cloudflare để thấy header thật)
docker run --rm -v "$PWD/zap:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.pethealth.example -r baseline.html -J baseline.json -c baseline.conf \
  -z "-config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=CF-Access-Client-Id -config replacer.full_list(0).replacement=$CF_ID -config replacer.full_list(0).enabled=true \
      -config replacer.full_list(1).matchtype=REQ_HEADER -config replacer.full_list(1).matchstr=CF-Access-Client-Secret -config replacer.full_list(1).replacement=$CF_SECRET -config replacer.full_list(1).enabled=true \
      -config replacer.full_list(2).matchtype=REQ_HEADER -config replacer.full_list(2).matchstr=Cookie -config replacer.full_list(2).replacement=__Host-ph_sid=$SID -config replacer.full_list(2).enabled=true"

# API scan (chủ động) theo openapi.yaml, chạy trong mạng Docker staging
docker run --rm --network ph-staging_edge -v "$PWD:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t /zap/wrk/openapi.yaml -f openapi -O http://caddy -r api.html -J api.json -z "<replacer Cookie, X-CSRF-Token, Origin như trên>"
```

API scan dùng tài khoản thử riêng `C` (scan có thể xóa dữ liệu). Nếu Bot Fight Mode chặn baseline, chạy baseline vào `http://caddy` trong mạng Docker và kiểm header edge riêng bằng `curl` (S7-02).

Xử lý cảnh báo: High/Critical → sửa và quét lại. Medium/Low → ghi bảng phân loại (cảnh báo, URL, quyết định: sửa / chấp nhận + lý do). `baseline.conf` chỉ đặt `IGNORE` cho cảnh báo đã có lý do chấp nhận.

**3. IDOR (G-9, NFR-SEC-004)**

1. `pnpm --filter api test:integration -- idor` trên SHA phát hành: 100% Pass.
2. Đối chiếu độ phủ: mọi `operationId` trong `openapi.yaml` có tham số đường dẫn (`petId`, `id`, `key`) có ít nhất 1 ca trong IDOR suite; script so sánh in danh sách thiếu, phải rỗng.
3. Thủ công trên staging với cookie của `B`: `GET`/`PATCH`/`DELETE` thú cưng, bản ghi khám, ảnh, mốc, việc, cân nặng của `A` → tất cả `404`, giống tài nguyên không tồn tại; dữ liệu của `A` không đổi.

**4. Ảnh riêng tư (G-11, NFR-SEC-006)**

| # | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Lấy `thumbUrl` từ `GET /visits/{id}`; tính `exp − now` | ≤ 900 s |
| 2 | Mở URL trong cửa sổ ẩn danh (không cookie) trong hạn | `200 image/jpeg`, `Cache-Control: private, max-age=900` |
| 3 | Đợi qua `exp` + 60 s, mở lại | `403` |
| 4 | Sửa 1 ký tự của `sig` hoặc tăng `exp` | `403` |
| 5 | `GET /media/<key>` không có `exp`, `sig` | `403` |
| 6 | Đường dẫn `../`, `%2e%2e/` trong `key` | `403`/`404`, không đọc được tệp ngoài `media/` |
| 7 | Gọi 2 lần URL hợp lệ qua Cloudflare | `cf-cache-status` ≠ `HIT` |
| 8 | Tải ảnh gốc về, `exiftool <file>` | Không có GPS/EXIF (NFR-SEC-011) |

**5. HTTPS, cookie, mật khẩu (G-10)**

- `Set-Cookie` sau đăng nhập: `__Host-ph_sid=...; Path=/; HttpOnly; Secure; SameSite=Strict`, không có `Domain`.
- `SELECT password_hash FROM users LIMIT 3` → bắt đầu bằng `$argon2id$v=19$m=19456,t=2,p=1$` (NFR-SEC-001).
- CSRF: `POST /api/v1/pets` có cookie nhưng thiếu `X-CSRF-Token` → `403`; `Origin: https://evil.example` → `403` (NFR-SEC-002).
- `POST /__test/clock` trên staging và production → `404` (endpoint chỉ có khi `NODE_ENV=test`).
- Trang không có nội dung trộn HTTP: DevTools Console sạch ở mọi màn hình (NFR-SEC-003).

**6. Dependency và bí mật (G-12, NFR-SEC-008, NFR-SEC-010)**

```bash
pnpm audit --prod --audit-level high          # thoát 0
osv-scanner scan --lockfile pnpm-lock.yaml    # 0 High/Critical
gitleaks detect --source . --log-opts="--all" --redact -v   # 0 phát hiện
grep -rEi "SMTP_PASS|MEDIA_SIGNING|HMAC|BEGIN .*PRIVATE KEY" apps/web/dist   # rỗng
```

Thêm (tùy chọn): `trivy image --severity HIGH,CRITICAL --ignore-unfixed ghcr.io/<owner>/ph-app:<sha>` và `ph-caddy`.

**7. Log không chứa dữ liệu nhạy cảm (NFR-SEC-009)**

Trên staging: đăng ký, đăng nhập sai, đổi mật khẩu, tạo bản ghi khám có triệu chứng/chẩn đoán/đơn thuốc chứa chuỗi đánh dấu `ZZSECRET`. Sau đó `docker compose -p ph-staging logs api worker | grep -c -E "ZZSECRET|<mật khẩu thử>|ph_sid="` = `0`.

**8. Host (SAD §4.1.5)**

- Từ mạng ngoài (4G), `nmap -Pn -p 1-65535 <IP công khai nhà>` → không cổng nào mở.
- `sshd -T | grep -E "passwordauthentication|permitrootlogin"` → `no`, `no`.
- `unattended-upgrades --dry-run` chạy không lỗi; `lsblk -f` thấy phân vùng `crypto_LUKS`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] ZAP baseline và API scan: 0 cảnh báo High; Medium đều có quyết định ghi lại (G-12).
- [ ] IDOR suite 100% Pass; danh sách endpoint thiếu ca IDOR rỗng; kiểm thủ công trả `404` (G-9).
- [ ] 8/8 ca bảng ảnh riêng tư đạt (G-11).
- [ ] Cookie đủ `HttpOnly`, `Secure`, `SameSite`; hash Argon2id đúng tham số; CSRF chặn đúng; `/__test/clock` trả `404` (G-10).
- [ ] `pnpm audit`, OSV-Scanner: 0 High/Critical; gitleaks: 0 phát hiện trên toàn lịch sử (G-12).
- [ ] Log không chứa chuỗi đánh dấu, mật khẩu hay token; bundle không chứa bí mật.
- [ ] Host không mở cổng nào ra Internet.

## Kiểm thử

Thứ tự: dependency + gitleaks (nhanh, chặn sớm) → IDOR suite → ZAP baseline → ZAP API scan → kiểm thủ công mục 4, 5, 7, 8. Mỗi lỗi High/Critical sửa trên nhánh riêng, qua CI, deploy staging, chạy lại đúng công cụ đã phát hiện. Task đạt khi mọi tiêu chí trên Pass trên cùng một SHA, SHA đó là SHA phát hành ở [S7-06](S7-06-release.md).

## Ghi chú

- Nếu gitleaks thấy bí mật thật trong lịch sử: xoay vòng bí mật đó ngay; không cần viết lại lịch sử git nếu bí mật đã bị vô hiệu.
- Xóa tài khoản `A`, `B`, `C` khỏi staging sau khi xong.
