# S7-01 · Stack production — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S7-01](../tasks/S7-01-production-stack.md) |
| Trạng thái | Xong, đang chạy tại `https://pet.vietdeptrai.io.vn` (WSL2 Ubuntu 26.04 trên máy nhà) |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

**Khác thiết kế (đơn giản hóa cho một máy):** không có staging (S2-06 bỏ qua), không đẩy image lên GHCR. Image build ngay trên máy từ mã ở `/opt/pethealth` (clone repo GitHub). Tạm chạy trên WSL2; sau chuyển VPS chỉ cần lặp lại các bước bên dưới.

- **`infra/compose.prod.yml`** (project `ph-prod`):
  - Container: `postgres` (16), `migrate` (chạy rồi thoát), `api`, `worker`, `caddy`, `cloudflared`, `autoheal`.
  - **Không publish cổng nào ra host.** Internet → Cloudflare → `cloudflared` (tunnel đi ra) → `caddy:8080` → `api:3000`.
  - Mạng: `edge` (caddy ↔ cloudflared), `app` internal (caddy ↔ api), `db` internal (↔ postgres), `egress` (api, worker ra R2 và Gmail).
  - Container `read_only`, `cap_drop: ALL`, `no-new-privileges`. Caddy giữ lại đúng `NET_BIND_SERVICE`, vì binary caddy của image chính thức cần quyền này mới chạy được.
  - Có healthcheck, `restart: unless-stopped`, `autoheal` khởi động lại container `unhealthy`, giới hạn bộ nhớ.
  - Volume Docker: `pgdata`, `media`, `media-incoming`. Image app tạo sẵn `/data/media` thuộc user `node`.
- **`infra/Caddyfile`:** CSP chặt (`default-src 'self'`…), HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, bỏ header `Server`, `/healthz-caddy`.
- **Bí mật** (`infra/ops/setup-secrets.sh`, người dùng tự chạy):
  - Nằm ở `/srv/pethealth/secrets/{postgres,app,cloudflared}.env`, quyền 600, chủ root.
  - Mật khẩu DB và khóa ký được sinh ngẫu nhiên. Gmail App Password, khóa R2 và token tunnel do người dùng nhập.
  - Không có trong repo.
- **Vận hành:**
  - `infra/ops/deploy.sh`: git pull → build → migrate → up → chờ api `healthy`.
  - `infra/ops/status.sh`: container, dung lượng, job lỗi 24 giờ, kiểm `https://…/api/v1/healthz`.
  - `infra/ops/backup-db.sh`: `pg_dump` nén vào `/srv/pethealth/backups`, giữ 14 bản, cron 02:30 hằng đêm. Bù cho DEC-020, chưa đẩy bản sao lưu ra ngoài máy.

## Kiểm tra trên production (2026-10-26)

- Mọi container `healthy`; `https://pet.vietdeptrai.io.vn/api/v1/healthz` → 200 qua Cloudflare (`cf-ray` SIN); header CSP và HSTS có mặt.
- Smoke test bằng trình duyệt (phone 390 px):
  - Đăng ký tài khoản thật thành công; email xác minh gửi qua Gmail (`email sent`).
  - Tạo hồ sơ công khai, up ảnh đại diện → `READY`; ảnh nằm trên R2, xem qua `/media` → 200 `image/jpeg`.
- Sao lưu tay chạy được (bản đầu 20 KB); cron đã cài (WSL có systemd, `cron` active).
- **Console:** CSP chặn script Cloudflare Web Analytics (`static.cloudflareinsights.com`) mà Cloudflare tự chèn. Không ảnh hưởng app; nên tắt tính năng này trên dashboard (app đã có analytics riêng).

## Lưu ý khi chạy trên WSL2

- **Điều kiện để web truy cập được:** máy Windows bật, Docker Desktop đang chạy, máy không ngủ.
- **Khởi động lại:** Docker Desktop đặt "Start when you sign in"; container tự chạy lại nhờ `unless-stopped`.
- **Chuyển VPS:** cài Docker → clone repo vào `/opt/pethealth` → chạy `setup-secrets.sh` → khôi phục bản sao lưu DB → `deploy.sh` → đổi tunnel (cùng token chạy được ở máy mới).
