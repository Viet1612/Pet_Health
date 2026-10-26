# Hướng dẫn chạy và triển khai Pet Health

Tài liệu cho người vận hành (chủ dự án). Gồm 3 phần:

- **Phần A — Máy dev (Windows):** chạy app để code và test.
- **Phần B — Production trên VPS (Ubuntu):** cài từ đầu, cập nhật, sao lưu, chuyển máy.
- **Phần C — Production trên WSL2 (máy nhà):** những điểm khác so với VPS.

Cập nhật: 2026-10-26. Bản production đầu tiên đang chạy tại `https://pet.vietdeptrai.io.vn` trên WSL2.

---

## 0. Tổng quan

```
Trình duyệt ──HTTPS──▶ Cloudflare (DNS, TLS, WAF)
                          │  Cloudflare Tunnel (kết nối đi ra từ máy chủ, không mở cổng)
                          ▼
                    cloudflared ──▶ caddy:8080 ──┬─▶ web tĩnh (SPA)
                                                 └─▶ api:3000 ──▶ postgres
                                                        │
                                       worker (email, ảnh, job đêm)
                                                        │
                              Cloudflare R2 (ảnh) · Gmail SMTP (email)
```

| | Máy dev | Production |
|---|---|---|
| Chạy bằng | `pnpm dev` (Node trực tiếp) | Docker Compose (`infra/compose.prod.yml`) |
| CSDL | PostgreSQL của ServBay trên Windows | Container `postgres:16` (volume `pgdata`) |
| Email | Mailpit (`localhost:8025`) | Gmail App Password |
| Ảnh | Đĩa: `apps/api/.data/media` | Cloudflare R2 (`STORAGE_DRIVER=r2`) |
| Truy cập | `http://localhost:5173`, điện thoại qua Tailscale | `https://<tên miền>` qua Cloudflare Tunnel |
| Bí mật | `apps/api/.env` (giá trị dev, không bí mật) | `/srv/pethealth/secrets/*.env` (quyền 600, không vào repo) |

---

## Phần A — Máy dev (Windows)

### A1. Cài đặt một lần

**Phần mềm cần có:**
- Node 22 (bật `corepack`).
- Docker Desktop (chỉ để chạy Mailpit).
- PostgreSQL 16 ở `127.0.0.1:5432` (bản của ServBay).
- `gitleaks` (pre-commit hook dùng).
- Tailscale (nếu muốn mở trên điện thoại).

1. **Cài dependency:**
   ```sh
   corepack enable
   pnpm install
   ```
2. **Tạo database và role dev** bằng superuser của PostgreSQL (ServBay). Mật khẩu superuser lấy trong ServBay; nhập qua biến `PGPASSWORD`, không lưu vào repo.
   ```sh
   psql -h 127.0.0.1 -p 5432 -U <superuser> -d postgres  -f infra/dev/init-db.sql   # role ph_owner + DB pethealth
   psql -h 127.0.0.1 -p 5432 -U <superuser> -d pethealth -f infra/dev/roles.sql     # role app_rw, app_worker
   psql -h 127.0.0.1 -p 5432 -U <superuser> -d postgres  -f infra/dev/e2e-db.sql    # DB pethealth_e2e cho E2E
   ```
3. **Tạo file cấu hình:** chép `apps/api/.env.example` → `apps/api/.env` và `apps/web/.env.example` → `apps/web/.env`. Giá trị trong đó chỉ dùng cho máy dev.
4. **Tạo bảng:** `pnpm db:migrate`.

### A2. Chạy hằng ngày

```sh
pnpm dev:up     # bật Mailpit (email thử) — giao diện http://localhost:8025
pnpm dev        # api (3000) + worker + web (5173), tự nạp lại khi sửa code
```

Mở `http://localhost:5173`. Đăng ký tài khoản mới thì email xác minh nằm trong Mailpit.

| Lệnh | Việc làm |
|---|---|
| `pnpm db:migrate` | Chạy migration mới (sau khi kéo code có migration) |
| `pnpm dev:reset` | Xóa sạch và tạo lại DB `pethealth` (mất dữ liệu dev) |
| `pnpm --filter @ph/api db:types` | Sinh lại kiểu TypeScript từ DB sau khi đổi schema |
| `pnpm openapi:gen` rồi `pnpm --filter @ph/api-client generate` | Sinh lại `openapi.yaml` và kiểu cho web sau khi đổi API |
| `pnpm --filter @ph/api maintenance:run` | Chạy tay job dọn dẹp đêm |
| `pnpm dev:down` | Tắt Mailpit |

### A3. Mở trên điện thoại (Tailscale)

1. Máy tính và điện thoại cùng đăng nhập Tailscale. Lấy IP Tailscale của máy tính, ví dụ `100.117.18.102`.
2. Trong `apps/api/.env` bật 2 dòng:
   ```
   EXTRA_ORIGINS=http://100.117.18.102:5173
   SESSION_COOKIE_SECURE=false
   ```
   Hai dòng này **chỉ dùng cho máy dev**: production từ chối `SESSION_COOKIE_SECURE=false`.
3. Chạy lại `pnpm dev`, rồi mở `http://100.117.18.102:5173` trên điện thoại.

### A4. Kiểm thử

| Lệnh | Phạm vi | Ghi chú |
|---|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm format:check` | Mã nguồn | — |
| `pnpm test:unit` | Unit (Vitest) | Nhanh, không cần DB |
| `pnpm --filter @ph/api test:idor` | IDOR + RLS | Cần Docker (Testcontainers) |
| `pnpm test:integration` | Integration | Cần Docker |
| `pnpm e2e` | E2E Playwright, phone + tablet | Tự bật API (3100), web (5174), worker trên DB `pethealth_e2e`; cần Mailpit đang chạy |

### A5. Thử bản Docker trên máy dev (tùy chọn)

`pnpm docker:full` build image app + caddy rồi chạy ở `http://localhost:8080`. Bản này dùng DB của ServBay qua `host.docker.internal`, cùng loại image với production.

---

## Phần B — Production trên VPS (Ubuntu)

### B1. Chuẩn bị bên ngoài (làm một lần)

| Việc | Ở đâu | Lấy về |
|---|---|---|
| Tên miền dùng DNS của Cloudflare | Cloudflare → Add site | Zone, ví dụ `vietdeptrai.io.vn` |
| **Tunnel** | Zero Trust → Networks → Tunnels → Create tunnel → Cloudflared → tên `pethealth` → môi trường Docker | **Token**: chuỗi sau `--token` trong lệnh mẫu (bắt đầu bằng `eyJ…`) |
| **Bucket R2** | R2 Object Storage → Create bucket `pethealth-media`, **không bật public** | — |
| **Khóa R2** | R2 → Manage API Tokens → **Account API Token**, quyền **Object Read & Write**, chỉ bucket `pethealth-media` | **Account ID**, **Access Key ID**, **Secret Access Key** (secret chỉ hiện một lần) |
| **Gmail App Password** | myaccount.google.com → bật xác minh 2 bước → `/apppasswords` → tạo "Pet Health" | Mã 16 ký tự |

Nếu đã làm các bước này cho WSL2 thì dùng lại được hết, kể cả token tunnel (xem B9).

**Giao diện tunnel mới:** trang tạo tunnel bắt phải có kết nối mới cho bấm Continue. Cách xử lý: lưu token vào máy chủ trước (B4), rồi chạy tạm:
```bash
docker run -d --name ph-tunnel-setup --env-file /srv/pethealth/secrets/cloudflared.env \
  cloudflare/cloudflared:2025.11.1 tunnel --no-autoupdate run
```
Trang báo Connected thì bấm Continue. Tới bước deploy (B5) thì gỡ container tạm: `docker rm -f ph-tunnel-setup`.

**Public hostname của tunnel:** Subdomain `pet`, Domain `vietdeptrai.io.vn`, Service URL **`http://caddy:8080`** (phải có `http://`).

### B2. Chuẩn bị máy chủ

**VPS gợi ý:** Ubuntu 24.04 trở lên, 2 vCPU, 2–4 GB RAM, ổ 40 GB.

```bash
# Đăng nhập bằng SSH key (tắt đăng nhập bằng mật khẩu)
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl ca-certificates openssl unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades     # tự cài bản vá bảo mật
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Tường lửa: chỉ mở SSH. Không cần mở 80/443 vì dùng Cloudflare Tunnel.
sudo ufw allow OpenSSH && sudo ufw --force enable

# Docker Engine + Compose plugin (script chính thức)
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
docker compose version
```

Nên tạo swap 2 GB nếu VPS chỉ có 2 GB RAM, vì lần build đầu (libvips + HEIC) tốn bộ nhớ:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### B3. Lấy mã nguồn

```bash
sudo git clone https://github.com/Viet1612/Pet_Health.git /opt/pethealth
cd /opt/pethealth
```

Các lệnh tiếp theo chạy bằng `root` (`sudo -i`) hoặc user thuộc nhóm `docker` có quyền ghi `/srv/pethealth`.

### B4. Tạo bí mật

```bash
sudo bash infra/ops/setup-secrets.sh
```

Script tạo 3 file trong `/srv/pethealth/secrets/` (quyền 600, chủ root):

| File | Nội dung | Nguồn |
|---|---|---|
| `postgres.env` | Mật khẩu superuser và 3 role ứng dụng | Tự sinh ngẫu nhiên |
| `app.env` | URL DB, Gmail, R2, `MEDIA_SIGNING_KEY`, `ANALYTICS_HMAC_KEY`, `APP_ORIGIN` | Hỏi Gmail + R2; khóa tự sinh |
| `cloudflared.env` | `TUNNEL_TOKEN` | Hỏi |

- Phần nhập không hiện trên màn hình.
- File đã tồn tại thì script giữ nguyên. Muốn đổi một giá trị thì sửa tay: `sudo nano /srv/pethealth/secrets/app.env`.
- Tên miền khác mặc định thì chạy `APP_ORIGIN=https://ten.mien sudo -E bash infra/ops/setup-secrets.sh`.
- **Chép bản sao 3 file vào trình quản lý mật khẩu.** Mất `postgres.env` thì vẫn chạy được nhưng không còn mật khẩu quản trị DB.

### B5. Deploy

```bash
sudo bash infra/ops/deploy.sh
```

Script chạy lần lượt:
1. `git pull` (nhánh `main`).
2. Build image `ph-app:prod`, `ph-caddy:prod`. Lần đầu khoảng 10–15 phút; các lần sau vài phút nhờ cache.
3. Khởi động postgres. **Lần đầu**, script `infra/postgres/init/01-roles.sh` tạo role `app_owner`, `app_rw`, `app_worker`.
4. Container `migrate` chạy migration rồi thoát.
5. Bật `api`, `worker`, `caddy`, `cloudflared`, `autoheal`.
6. Chờ `api` khỏe. Quá 2 phút chưa khỏe thì báo lỗi kèm lệnh xem log.

Kiểm tra:
```bash
sudo bash infra/ops/status.sh
```
Mọi container phải `healthy` (riêng `migrate` là `Exited (0)`), dòng cuối báo `…/api/v1/healthz → 200`. Sau đó mở trang web, đăng ký thử một tài khoản: email xác minh phải tới hộp thư, up ảnh đại diện phải hiện.

### B6. Thiết lập trên Cloudflare (khuyến nghị)

| Mục | Thiết lập |
|---|---|
| SSL/TLS → Edge Certificates | **Always Use HTTPS**: On; Minimum TLS 1.2 |
| Security → WAF | Bật **Managed rules** (gói Free có bộ cơ bản) |
| Security → WAF → Rate limiting rules | Đường dẫn bắt đầu bằng `/api/v1/auth/` → 20 request / 1 phút / IP → Block 10 phút |
| Caching | Không cần rule riêng: API trả `Cache-Control: no-store`, `/media` trả `private` |
| Analytics & Logs → Web Analytics | **Tắt** tự chèn script. CSP của app chặn script này, và app đã có analytics riêng |
| Tunnel bị lộ token | Tunnels → `pethealth` → **Refresh token** → sửa `cloudflared.env` → `docker compose -f infra/compose.prod.yml up -d cloudflared` |

### B7. Sao lưu

**Sao lưu CSDL hằng đêm** (pg_dump nén, giữ 14 bản trong `/srv/pethealth/backups`):
```bash
sudo bash infra/ops/backup-db.sh          # chạy thử một lần
( sudo crontab -l 2>/dev/null; echo "30 2 * * * bash /opt/pethealth/infra/ops/backup-db.sh >> /var/log/pethealth-backup.log 2>&1" ) | sudo crontab -
```

- **Ảnh** nằm trên R2, không cần sao lưu ở máy chủ.
- **Nên** chép bản sao lưu ra ngoài máy chủ định kỳ: tải về máy nhà bằng `scp`, hoặc đẩy lên một bucket R2 riêng. Bản sao lưu nằm cùng máy với DB thì không cứu được khi mất máy.

**Khôi phục** (DB đang chạy sẽ bị thay thế, nên dừng app trước):
```bash
cd /opt/pethealth
C="docker compose -f infra/compose.prod.yml"
$C stop api worker
$C exec -T postgres psql -U postgres -c "DROP DATABASE pethealth" -c "CREATE DATABASE pethealth OWNER app_owner"
gunzip -c /srv/pethealth/backups/<tệp>.sql.gz | $C exec -T postgres psql -q -v ON_ERROR_STOP=1 -U app_owner -d pethealth
sudo NO_PULL=1 bash infra/ops/deploy.sh
```

Khôi phục bằng role `app_owner` để bảng vẫn thuộc `app_owner`, như vậy migration sau này mới sửa được bảng. Cách này đã chạy thử ngày 2026-10-26: 45 bảng, 33 policy RLS khôi phục đúng.

### B8. Cập nhật phiên bản và quay lại bản cũ

```bash
cd /opt/pethealth
sudo bash infra/ops/deploy.sh                      # lấy bản mới nhất của main
```

**Quay lại một commit cũ** khi bản mới lỗi:
```bash
sudo git -C /opt/pethealth checkout <sha-cũ>
sudo NO_PULL=1 bash infra/ops/deploy.sh
# sửa xong thì quay về main:
sudo git -C /opt/pethealth checkout main && sudo bash infra/ops/deploy.sh
```

Migration chỉ có chiều tiến. Nếu bản mới đã chạy migration thì quay code về bản cũ vẫn chạy được, vì các migration hiện tại chỉ thêm bảng / cột. Migration xóa cột sau này phải ghi rõ cách quay lại.

### B9. Chuyển từ WSL2 (máy nhà) sang VPS

Dữ liệu cần chuyển gồm **CSDL** và **bí mật**. Ảnh đã nằm trên R2 nên không phải chuyển. Tunnel dùng **chung token**, nên tên miền không đổi.

1. **Trên WSL2:** sao lưu và gom bí mật.
   ```bash
   sudo bash /opt/pethealth/infra/ops/backup-db.sh
   sudo tar czf /root/pethealth-move.tgz -C /srv/pethealth secrets backups
   ```
2. **Chép sang VPS** (máy nhà → VPS):
   ```bash
   scp /root/pethealth-move.tgz <user>@<vps>:/tmp/
   ```
3. **Trên VPS:** làm B2, B3. Sau đó giải nén bí mật, không chạy `setup-secrets.sh`, để giữ mật khẩu DB cũ:
   ```bash
   sudo mkdir -p /srv/pethealth && sudo tar xzf /tmp/pethealth-move.tgz -C /srv/pethealth
   sudo chmod 700 /srv/pethealth/secrets && sudo chmod 600 /srv/pethealth/secrets/*.env
   ```
4. **Trên VPS:** chỉ bật postgres (tạo role) rồi khôi phục, **trước khi** deploy:
   ```bash
   cd /opt/pethealth
   C="docker compose -f infra/compose.prod.yml"
   sudo $C up -d postgres
   sudo $C exec -T postgres pg_isready -U postgres     # lặp lại tới khi "accepting connections"
   gunzip -c "$(ls -1t /srv/pethealth/backups/*.sql.gz | head -1)" \
     | sudo $C exec -T postgres psql -q -v ON_ERROR_STOP=1 -U app_owner -d pethealth
   ```
5. **Tắt bản trên WSL2** để không có 2 nơi cùng nhận request qua một tunnel:
   ```bash
   # trên WSL2
   cd /opt/pethealth && docker compose -f infra/compose.prod.yml down
   ```
   Lệnh `down` giữ nguyên volume dữ liệu trên WSL2 để phòng khi cần quay lại.
6. **Trên VPS:** `sudo bash infra/ops/deploy.sh`, rồi `status.sh`, rồi đăng nhập bằng tài khoản cũ để kiểm tra dữ liệu.
7. Xong thì xóa `/tmp/pethealth-move.tgz` trên VPS và `/root/pethealth-move.tgz` trên WSL2, vì trong đó có bí mật.

### B10. Vận hành hằng ngày

| Việc | Lệnh (trong `/opt/pethealth`) |
|---|---|
| Tình trạng | `sudo bash infra/ops/status.sh` |
| Xem log | `sudo docker compose -f infra/compose.prod.yml logs -f --tail 100 api worker` |
| Khởi động lại một dịch vụ | `sudo docker compose -f infra/compose.prod.yml restart api` |
| Dừng toàn bộ / bật lại (giữ dữ liệu) | `… stop` / `… up -d` |
| Mở psql | `sudo docker compose -f infra/compose.prod.yml exec postgres psql -U postgres -d pethealth` |
| Dọn image / cache build cũ | `sudo docker image prune -f && sudo docker builder prune -f --keep-storage 5GB` |
| Gỡ bài vi phạm (không có chức năng báo cáo) | Xem ghi chú vận hành ở [F-13](../implement/task_done/F-13-cross-account-tests.md) |

**Không bao giờ chạy** `docker compose … down -v`: cờ `-v` xóa volume, tức là mất CSDL.

### B11. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Web báo lỗi 502 / 1033 của Cloudflare | `cloudflared` hoặc `caddy` không chạy; public hostname sai | `status.sh`; Service URL trên Cloudflare phải là `http://caddy:8080` |
| `caddy` khởi động lại liên tục, log `exec /usr/bin/caddy: operation not permitted` | Thiếu `cap_add: [NET_BIND_SERVICE]` | Đã có trong `compose.prod.yml`; kiểm tra lại nếu tự sửa file |
| `api` báo lỗi cấu hình khi khởi động | `app.env` thiếu hoặc sai biến | `… logs api` in đúng tên biến lỗi; sửa `app.env` rồi `up -d` |
| Không nhận được email | Sai App Password, Gmail chặn, hoặc vượt `SMTP_DAILY_LIMIT` | `… logs worker \| grep -i email`; tạo App Password mới |
| Up ảnh lỗi, ảnh không hiện | Khóa R2 sai hoặc thiếu quyền bucket | `… logs worker`; kiểm tra token R2 là Object Read & Write trên đúng bucket |
| `migrate` thoát mã khác 0 | Migration lỗi | `… logs migrate`; app giữ bản cũ cho tới khi migrate qua |
| Build hết RAM (bị kill) | VPS 1–2 GB | Thêm swap (B2) |

---

## Phần C — Production trên WSL2 (máy nhà)

Cách cài giống Phần B, với Ubuntu 26.04 trong WSL2 và Docker Engine cài thẳng trong Ubuntu (systemd bật `docker`, không dùng Docker Desktop). Những điểm khác:

- **Không cần** B2 (ufw, SSH): máy không có cổng nào mở ra Internet, tunnel tự đi ra.
- **WSL không tự chạy khi Windows khởi động** và **tự tắt Ubuntu khi không còn cửa sổ / tiến trình nào giữ nó**. Ubuntu tắt thì web tắt, và lịch sao lưu đêm trong cron cũng không chạy.
  - **Cách tay:** sau khi bật máy, mở terminal Ubuntu một lần. systemd khởi động Docker, các container tự chạy lại (`restart: unless-stopped`) sau khoảng 1 phút.
  - **Cách tự động:** tạo tác vụ trong Windows Task Scheduler, trigger **At log on**, chạy ẩn
    ```
    wsl.exe -d Ubuntu -u root -- sleep infinity
    ```
    Tác vụ vừa bật Ubuntu vừa giữ nó chạy. Chỉ chạy khi đã đăng nhập Windows.
- **Máy ngủ hoặc tắt = web tắt.** Tắt chế độ ngủ của Windows nếu muốn web chạy liên tục. Muốn chạy 24/7 thật sự thì chuyển VPS (B9).
- **File bí mật xem từ Windows:** `\\wsl$\Ubuntu\srv\pethealth\secrets` (chỉ root đọc được).
- **Kiểm tra sau khi bật máy:**
  ```bash
  cd /opt/pethealth && bash infra/ops/status.sh
  ```
