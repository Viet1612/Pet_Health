# S7-02 · Cloudflare (tunnel, WAF, rate limit, cache) và Gmail

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S7 · T15–16 |
| Story | — |
| Yêu cầu | G-10, G-14, NFR-SEC-003, NFR-SEC-005, NFR-SEC-006, NFR-PERF-004 |
| Phụ thuộc | [S7-01](S7-01-production-stack.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

Đưa `app.pethealth.example` ra Internet qua Cloudflare Tunnel với HTTPS bắt buộc, TLS ≥ 1.2, HSTS, WAF, Bot Fight Mode, rate limit cho `/api/v1/auth/*` và quy tắc cache đúng (không bao giờ cache ảnh riêng tư). Cấu hình Gmail SMTP cho production và chứng minh email tài khoản vào hộp thư chính của Gmail và Outlook (G-14).

## Phạm vi

**Trong phạm vi:** DNS, public hostname của tunnel, SSL/TLS, HSTS, WAF managed rules, Bot Fight Mode, 1 rule rate limit, cache rules, trang bảo trì (tùy chọn), tài khoản Gmail riêng, App Password, thử gửi email.

**Ngoài phạm vi:** compose, Caddy, ingress `cloudflared` → [S7-01](S7-01-production-stack.md). Quét bảo mật và kiểm `/media` không bị cache bằng công cụ → [S7-04](S7-04-security-test.md). Cloudflare Access cho staging đã có từ [S2-06](S2-06-server-staging.md).

## Chi tiết kỹ thuật

Tên miền `pethealth.example` là placeholder (DEC-021); thay bằng tên miền thật ở mọi bước.

**1. DNS và tunnel**

1. Zero Trust → Networks → Tunnels → tunnel hiện có → Public Hostname: `app.pethealth.example` → `http://caddy:80`.
2. Kiểm DNS: bản ghi `CNAME app → <tunnel-uuid>.cfargotunnel.com`, trạng thái **Proxied**. Không có bản ghi A/AAAA trỏ về IP nhà.

**2. SSL/TLS và HSTS (Zone → SSL/TLS)**

| Mục | Giá trị |
|---|---|
| Encryption mode | Full |
| Edge Certificates → Always Use HTTPS | On |
| Minimum TLS Version | TLS 1.2 |
| TLS 1.3 | On |
| Automatic HTTPS Rewrites | On |
| HSTS | Enable; `max-age` 12 tháng (31536000); Include subdomains On; Preload Off; No-Sniff On |

Preload để Off: bật preload khó gỡ nếu sau này đổi tên miền.

**3. Bảo mật (Security)**

| Mục | Cấu hình |
|---|---|
| WAF → Managed rules | Bật Cloudflare Free Managed Ruleset (mặc định của gói miễn phí) |
| Bots → Bot Fight Mode | On |
| WAF → Rate limiting rules | Tên `auth-rate-limit`; biểu thức `starts_with(http.request.uri.path, "/api/v1/auth/")`; đặc tính: IP; ngưỡng **30 request / 1 phút**; hành động **Block** trong **10 phút** |
| Security Level | Medium |

Gói miễn phí có thể chỉ cho chọn chu kỳ 10 s và thời gian chặn 10 s. Khi đó dùng mức gần nhất: **5 request / 10 s / IP → Block 10 s**; giới hạn ở tầng ứng dụng (bảng `rate_limits`, SAD §4.2.3) vẫn là lớp chính.

**4. Cache rules (Caching → Cache Rules, theo thứ tự)**

| # | Điều kiện | Hành động |
|---|---|---|
| 1 | `starts_with(http.request.uri.path, "/media/")` | Bypass cache |
| 2 | `starts_with(http.request.uri.path, "/api/")` | Bypass cache |
| 3 | `starts_with(http.request.uri.path, "/assets/")` | Eligible for cache; Edge TTL: dùng header origin (`immutable`, 1 năm); Browser TTL: respect origin |

`index.html` không vào rule nào và có `Cache-Control: no-cache` từ Caddy nên luôn được kiểm lại. Sau mỗi lần deploy không cần purge vì asset có hash trong tên.

**5. Trang bảo trì (tùy chọn)**

Custom Pages → "Origin unreachable / 5xx" (nếu gói cho phép): HTML tĩnh tiếng Việt "Pet Health đang bảo trì, vui lòng quay lại sau ít phút", không gọi script ngoài.

**6. Gmail SMTP**

1. Tạo tài khoản Gmail riêng cho Pet Health (không dùng Gmail cá nhân).
2. Bật xác minh 2 bước (ứng dụng xác thực, không dùng SMS làm phương thức duy nhất); lưu mã dự phòng vào trình quản lý mật khẩu.
3. Tạo App Password tên `pethealth-prod`. Ghi vào `/srv/pethealth/secrets/worker.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=<tài khoản>@gmail.com
   SMTP_PASS=<app password 16 ký tự, bỏ dấu cách>
   EMAIL_FROM="Pet Health <tài khoản>@gmail.com"
   ```
   `EMAIL_FROM` phải trùng địa chỉ Gmail, nếu không Gmail viết lại header và dễ bị đánh spam.
4. `docker compose -p ph-prod up -d --no-deps worker`; log worker có dòng xác minh SMTP thành công, không có `535 Authentication failed`.
5. Đặt tên hiển thị và ảnh đại diện cho tài khoản Gmail để email trông đáng tin.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] `curl -sI http://app.pethealth.example/` trả `301` sang `https://` (G-10).
- [ ] `openssl s_client -connect app.pethealth.example:443 -tls1_1` thất bại; `-tls1_2` và `-tls1_3` thành công (G-10, NFR-SEC-003).
- [ ] Response HTTPS có `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- [ ] Gửi 40 request `POST /api/v1/auth/login` trong 1 phút từ một IP → các request vượt ngưỡng nhận `429`/trang chặn của Cloudflare, IP bị chặn trong thời gian đã cấu hình (NFR-SEC-005).
- [ ] Hai lần `GET` cùng một URL `/media/...` ký hợp lệ: `cf-cache-status` là `BYPASS` hoặc `DYNAMIC`, không bao giờ `HIT` (NFR-SEC-006).
- [ ] Lần thứ hai tải `/assets/<hash>.js`: `cf-cache-status: HIT`.
- [ ] Email xác minh và email đặt lại mật khẩu, mỗi loại 3 lần, tới **Hộp thư đến** (không phải Spam/Junk) của 1 tài khoản Gmail và 1 tài khoản Outlook.com (G-14).
- [ ] Mỗi email tới hộp thư trong ≤ 1 phút kể từ lúc bấm gửi (NFR-PERF-004).
- [ ] App Password chỉ có trong `/srv/pethealth/secrets/worker.env` và trình quản lý mật khẩu.

## Kiểm thử

**Edge:**

```bash
curl -sI http://app.pethealth.example/ | head -3
curl -sI https://app.pethealth.example/ | grep -iE 'strict-transport|content-security|cf-cache'
for t in tls1_1 tls1_2 tls1_3; do echo | openssl s_client -connect app.pethealth.example:443 -$t 2>&1 | grep -E 'Protocol|alert'; done
for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Content-Type: application/json' -d '{"email":"x@example.com","password":"sai"}' \
  https://app.pethealth.example/api/v1/auth/login; done | sort | uniq -c
```

Chạy thử rate limit từ mạng 4G của điện thoại (hotspot), không chạy từ IP đang dùng để quản trị.

**Email (G-14):** dùng 1 địa chỉ Gmail và 1 địa chỉ Outlook.com của Việt.

| # | Thao tác | Gmail | Outlook | Thời gian tới |
|---|---|---|---|---|
| 1–3 | Đăng ký → email xác minh | Inbox / Spam | Inbox / Junk | … s |
| 4–6 | Quên mật khẩu → email đặt lại | Inbox / Spam | Inbox / Junk | … s |

Với mỗi email: mở "Show original" (Gmail) hoặc "View message source" (Outlook), xác nhận `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`; bấm liên kết mở đúng `https://app.pethealth.example/...` và thao tác thành công. Đạt khi 12/12 email vào hộp thư chính. Nếu email vào Junk của Outlook: đánh dấu "Not junk" **không** được tính là Pass; kiểm lại nội dung (tiêu đề tiếng Việt rõ ràng, có bản text thuần, không rút gọn liên kết) rồi gửi lại.

## Ghi chú

- Nếu `app.pethealth.example` đang đặt sau Cloudflare Access (S7-01, Ghi chú), các lệnh `curl` thêm header `CF-Access-Client-Id` / `CF-Access-Client-Secret` của một service token; kiểm lại header HSTS và rate limit lần nữa sau khi gỡ Access ở S7-06.
- Các tài khoản dùng thử email trên production xóa bằng `DELETE /me` sau khi xong, hoặc giữ một tài khoản làm tài khoản smoke test cho [S7-06](S7-06-release.md).
- Bot Fight Mode áp dụng cho cả zone nên có thể chặn công cụ chạy qua `staging.pethealth.example`; các bài test tải và contract ở S7-03, S7-05 chạy thẳng vào mạng Docker của staging.
- Xoay vòng App Password 12 tháng/lần (SAD §4.1.6).
