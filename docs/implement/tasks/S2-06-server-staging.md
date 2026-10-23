# S2-06 · Cài máy chủ, staging, `deploy.sh`, build image lên GHCR

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S2 · T5–6 |
| Story | — |
| Yêu cầu | SAD §2.0, §4.1.3, §4.1.5, §4.1.6, §4.2.2, §4.4.1–4.4.3; AD-009, AD-014; NFR-SEC-003, NFR-REL-001 |
| Phụ thuộc | [S0-10](S0-10-docker-images.md) |
| Ước lượng | 2 |
| Màn hình Figma | — |

## Mục tiêu

Máy chủ tự dựng được gia cố, chạy compose project `ph-staging` tại `https://staging.pethealth.example` sau Cloudflare Access, không mở cổng nào vào mạng nhà. Mỗi commit trên `main` có image `ph-app` và `ph-caddy` trên GHCR; `infra/ops/deploy.sh` triển khai một SHA và tự quay về bản tốt gần nhất khi hỏng.

## Phạm vi

**Trong phạm vi:** cài Ubuntu (LUKS, `ufw`, SSH, `unattended-upgrades`); Docker; tunnel `cloudflared`; Cloudflare Access; `infra/compose.staging.yml`, `infra/compose.edge.yml`, `infra/cloudflared/config.yml`; bí mật staging; Mailpit; workflow build image; `infra/ops/deploy.sh`.

**Ngoài phạm vi:** stack `ph-prod`, CSP, `autoheal`, UPS/NUT, `ops/status.sh` (S7-01); DNS/WAF/rate limit/HSTS cho `app.pethealth.example`, bypass cache `/media/*`, Gmail thật (S7-02); E2E sau deploy (S4-06).

## Chi tiết kỹ thuật

**1. Hệ điều hành** (phần cứng tối thiểu SAD §4.2.5: 4 nhân x86-64, 8 GB RAM, SSD 512 GB)

1. Ubuntu Server 24.04 LTS, chọn "Use an entire disk" + **LVM + LUKS** (SAD §4.1.3). Mở khóa khi khởi động: xem Ghi chú.
2. User `viet` có `sudo`; chép khóa công khai vào `~/.ssh/authorized_keys`.
3. `/etc/ssh/sshd_config.d/10-ph.conf`: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`, `AllowUsers viet`; `systemctl reload ssh`.
4. `ufw default deny incoming`, `ufw default allow outgoing`, `ufw allow from <LAN_CIDR> to any port 22 proto tcp`, `ufw enable`. Router không port-forward.
5. `apt install unattended-upgrades`; bật `Unattended-Upgrade::Origins-Pattern` cho `-security`; `Automatic-Reboot "false"`.
6. Docker Engine + compose plugin từ repo chính thức; `systemctl enable --now docker containerd`. `/etc/docker/daemon.json`:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true, "no-new-privileges": true }
```

Compose **không** khai báo `ports:` cho service nào: Docker chèn rule iptables trước `ufw`, cổng publish sẽ lọt qua tường lửa.

**2. Thư mục và bí mật** (SAD §4.1.6)

```
/opt/pethealth/                 # git clone (deploy key chỉ đọc); deploy.sh checkout theo SHA
/srv/pethealth/secrets/         # root:root 700; mỗi tệp 600
  staging.app.env  staging.db.env  cloudflared-creds.json
/srv/pethealth/staging/{pgdata,media/incoming}  # media chown cho UID không root của image (S0-10)
/srv/pethealth/staging/.last-good
```

`staging.app.env`: `NODE_ENV=production`, `APP_ORIGIN=https://staging.pethealth.example`, `DATABASE_URL` (role `app_rw`), `WORKER_DATABASE_URL` (`app_worker`), `MIGRATION_DATABASE_URL` (owner), `MEDIA_ROOT=/data/media`, `MEDIA_SIGNING_KEY`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, `SMTP_DAILY_LIMIT=400`, `ANALYTICS_HMAC_KEY`. Mọi khóa sinh bằng `openssl rand -base64 32`, khác giá trị production. Bản sao lưu vào trình quản lý mật khẩu. Repo chỉ có `infra/*.env.example`.

**3. Mạng và compose** (SAD §2.0)

| Mạng | `internal` | Thành viên |
|---|---|---|
| `ph_edge` (external, tạo một lần `docker network create ph_edge`) | không | `cloudflared`, `caddy` (alias `caddy-staging`) |
| `app` | có | `caddy`, `api` |
| `db` | có | `api`, `worker`, `postgres` |
| `mail` | có | `worker`, `mailpit`, `caddy` (chỉ staging) |

`infra/compose.staging.yml` (`name: ph-staging`):

- `postgres`: `postgres:16@sha256:…`, volume `/srv/pethealth/staging/pgdata`, `shared_buffers=512MB`, `max_connections=50`, healthcheck `pg_isready`.
- `api` / `worker`: `ghcr.io/${GHCR_OWNER}/ph-app:${IMAGE_TAG:?}`, entrypoint `api`/`worker`, `env_file: /srv/pethealth/secrets/staging.app.env`, `read_only: true` + `tmpfs: /tmp`, `cap_drop: [ALL]`, `user` không root, `stop_grace_period: 20s`, `mem_limit` 512m / 768m. Media: `worker` rw; `api` ro + `incoming/` rw (S2-02). Healthcheck `api`: `node -e "fetch('http://127.0.0.1:3000/readyz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"` mỗi 15 s; `worker`: tuổi `/tmp/alive` < 90 s.
- `caddy`: `ghcr.io/${GHCR_OWNER}/ph-caddy:${IMAGE_TAG}`, `read_only: true`; mount `infra/caddy/staging-mailpit.caddy` vào `/etc/caddy/extra/` để proxy `/_mailpit/*` → `mailpit:8025` (Caddyfile chính có `import /etc/caddy/extra/*.caddy`).
- `mailpit`: `axllent/mailpit` ghim digest, `MP_WEBROOT=/_mailpit/`, `MP_MAX_MESSAGES=500`.
- Mọi service `restart: unless-stopped`, log driver mặc định của daemon.

**4. Cloudflare Tunnel và Access**

1. `cloudflared tunnel login` → `cloudflared tunnel create pethealth` → chép credentials vào `secrets/cloudflared-creds.json`.
2. `infra/cloudflared/config.yml`: `tunnel: <ID>`, `credentials-file: /etc/cloudflared/creds.json`, ingress `staging.pethealth.example` → `http://caddy-staging:80`, mục cuối `http_status:404` (S7-02 thêm `app.`).
3. `cloudflared tunnel route dns pethealth staging.pethealth.example`.
4. `infra/compose.edge.yml` (`name: ph-edge`): `cloudflare/cloudflared` ghim phiên bản, `command: tunnel --no-autoupdate run`, mạng `ph_edge`. Tách project để staging và prod dùng chung một tunnel.
5. Zero Trust → Access → Self-hosted app `staging.pethealth.example`: policy Allow theo email của Việt (One-time PIN), phiên 24 h; thêm **Service Token** + policy Service Auth cho Playwright (header `CF-Access-Client-Id`, `CF-Access-Client-Secret`).

**5. Build image** (`.github/workflows/images.yml`, SAD §4.4.3)

- Kích hoạt: `workflow_run` của CI khi `main` xanh. `permissions: { contents: read, packages: write }`.
- `docker/build-push-action`, `platforms: linux/amd64`, cache `type=gha`: `infra/Dockerfile` → `ghcr.io/<owner>/ph-app:<git SHA 40 ký tự>`, `infra/Dockerfile.caddy` → `ph-caddy:<SHA>`; label `org.opencontainers.image.revision`. Không đẩy tag `latest`.
- Máy chủ `docker login ghcr.io` bằng PAT chỉ có `read:packages`.

**6. `infra/ops/deploy.sh <staging|prod> <sha>`** (chạy bằng `sudo` qua SSH)

```bash
set -euo pipefail
ENV=$1; SHA=$2
[[ $ENV =~ ^(staging|prod)$ && $SHA =~ ^[0-9a-f]{40}$ ]] || { echo "usage"; exit 2; }
exec 9>/var/lock/ph-deploy-$ENV.lock; flock -n 9 || { echo "đang deploy"; exit 3; }
STATE=/srv/pethealth/$ENV; LAST_GOOD=$(cat "$STATE/.last-good" 2>/dev/null || true)
dc() { docker compose -p "ph-$ENV" -f /opt/pethealth/infra/compose.$ENV.yml "$@"; }
deploy_tag() {                                   # $1 = SHA
  git -C /opt/pethealth fetch -q origin && git -C /opt/pethealth checkout -q --detach "$1"
  export IMAGE_TAG=$1
  dc pull -q api worker caddy
}
wait_ready() { for _ in $(seq 30); do dc exec -T api node -e "fetch('http://127.0.0.1:3000/readyz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" && return 0; sleep 2; done; return 1; }
deploy_tag "$SHA"
dc run --rm api migrate                          # migration expand/contract, tương thích ngược
dc up -d --no-deps worker api caddy
if wait_ready; then echo "$SHA" > "$STATE/.last-good"; exit 0; fi
echo "readyz không khỏe sau 60 s, quay về $LAST_GOOD" >&2
[[ -n $LAST_GOOD && $LAST_GOOD != "$SHA" ]] && { deploy_tag "$LAST_GOOD"; dc up -d --no-deps worker api caddy; wait_ready || true; }
exit 1
```

Mỗi lần chạy ghi một dòng `thời điểm · env · sha · kết quả` vào `$STATE/deploy.log`. Lần đầu (chưa có `.last-good`) chạy `dc up -d` đủ stack trước.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Ổ hệ thống mã hóa LUKS (`lsblk -f` thấy `crypto_LUKS`); máy khởi động lại thì stack `ph-edge` và `ph-staging` tự chạy lại.
- [ ] SSH bằng mật khẩu và bằng `root` bị từ chối; `ufw status` chỉ cho cổng 22 từ LAN; `nmap` từ LAN chỉ thấy cổng 22.
- [ ] `docker ps` không có cổng nào publish ra host.
- [ ] `https://staging.pethealth.example` chưa đăng nhập Access → trang đăng nhập Cloudflare; email khác email của Việt bị từ chối; Service Token truy cập được.
- [ ] Container `api` và `postgres` không ra Internet được; `worker` gửi được tới `mailpit`; đăng ký tài khoản trên staging → thư xác minh hiện ở `/_mailpit/`.
- [ ] Tệp trong `/srv/pethealth/secrets` quyền `600`, chủ `root`; `gitleaks` không phát hiện bí mật trong repo.
- [ ] Merge vào `main` → GHCR có `ph-app:<sha>` và `ph-caddy:<sha>`.
- [ ] `deploy.sh staging <sha>` thành công ghi `.last-good`; SHA có `/readyz` hỏng → tự quay về `.last-good` trong ≤ 60 s + thời gian khởi động, exit 1.
- [ ] Trên staging: tải ảnh HEIC làm avatar hiển thị đúng trên Chrome; URL ảnh quá 15 phút trả `403` (điều kiện hoàn thành S2).

## Kiểm thử

- **Gia cố:** `ssh -o PubkeyAuthentication=no viet@server` → bị từ chối; `ssh root@server` → bị từ chối; từ mạng 4G thử truy cập IP công cộng của nhà → không có cổng mở.
- **Cô lập mạng:** `dc exec api node -e "fetch('https://example.com').then(()=>console.log('LỘ'),()=>console.log('chặn'))"` → "chặn"; tương tự cho `caddy` (chỉ có `ph_edge` ra ngoài qua `cloudflared`).
- **Deploy:** deploy SHA A → B (thành công) → C cố ý hỏng (`/readyz` trả 503 khi có biến `FAIL_READY=1` chỉ trong test) → kiểm `.last-good` vẫn là B và phiên bản đang chạy là B; hai lệnh deploy song song → lệnh sau thoát mã 3.
- **Tự phục hồi:** `sudo reboot` → sau khi mở khóa đĩa, `curl` staging qua Access trả SPA trong ≤ 3 phút; `docker kill ph-staging-api-1` → container chạy lại.
- **Bí mật:** `stat -c '%a %U' /srv/pethealth/secrets/*` → `600 root`.

## Ghi chú

- **LUKS và khởi động không người trông:** passphrase hỏi lúc boot sẽ làm máy đứng sau mất điện. Chọn một: `clevis` + TPM2 tự mở khóa (vẫn chống tháo ổ đĩa, không chống mất cả máy) hoặc `dropbear-initramfs` để nhập passphrase qua SSH trong LAN. Ghi lựa chọn vào `docs/ops/server.md`.
- **VLAN (tùy chọn):** nếu router hỗ trợ, đặt máy chủ ở VLAN/mạng khách riêng, chặn đi vào mạng LAN gia đình, giảm thiệt hại khi máy chủ bị chiếm (SAD §1.1 D2).
- **R3 / G-14 sớm:** một lần trong S2, tạm trỏ worker staging sang Gmail SMTP thật (`smtp.gmail.com:465`, App Password của tài khoản Gmail riêng, gắn tạm worker vào mạng `smtp-out` không `internal`) để gửi thử tới Gmail và Outlook, rồi trả về Mailpit.
