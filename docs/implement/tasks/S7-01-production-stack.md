# S7-01 · Stack production: compose, CSP, autoheal, `ops/status.sh`, UPS

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S7 · T15–16 |
| Story | — |
| Yêu cầu | NFR-REL-001, NFR-SEC-003, NFR-SEC-007, NFR-SEC-010, G-10 |
| Phụ thuộc | [S2-06](S2-06-server-staging.md) |
| Ước lượng | 1,5 ngày |
| Màn hình Figma | — |

## Mục tiêu

Dựng compose project `ph-prod` cho `app.pethealth.example` trên cùng máy chủ với staging: 5 container theo SAD §2.0, mạng cô lập, healthcheck và tự phục hồi, header bảo mật và CSP ở Caddy, giới hạn bộ nhớ, tắt máy an toàn qua UPS và script kiểm tra nhanh `ops/status.sh`.

## Phạm vi

**Trong phạm vi:** `infra/compose.prod.yml`, `infra/Caddyfile` (header, CSP, cache), cấu hình PostgreSQL, thư mục bí mật production, `autoheal`, NUT, `infra/ops/status.sh`, ingress `app.pethealth.example` trong `infra/cloudflared/config.yml`.

**Ngoài phạm vi:** cấu hình phía Cloudflare (WAF, rate limit, HSTS edge, cache rule) → [S7-02](S7-02-cloudflare-email.md). Phát hành bản đầu tiên và smoke test → [S7-06](S7-06-release.md). Sao lưu (DEC-020) → sau Giai đoạn 1. `deploy.sh` đã có từ [S2-06](S2-06-server-staging.md), chỉ kiểm lại chạy được với `prod`.

## Chi tiết kỹ thuật

**1. Thư mục trên máy chủ**

```
/srv/pethealth/pgdata          # volume Postgres production (SSD, LUKS)
/srv/pethealth/media           # kho ảnh production
/srv/pethealth/secrets/        # root:root, 700; tệp *.env quyền 600
  postgres.env  api.env  worker.env  cloudflared.json
```

`api.env`: `DATABASE_URL` (role `app_rw`), `MEDIA_SIGNING_KEY`, `ANALYTICS_HMAC_KEY`. `worker.env`: `DATABASE_URL` (role `app_worker`), `SMTP_USER`, `SMTP_PASS` (điền ở S7-02). Khóa sinh bằng `openssl rand -base64 48`, khác hoàn toàn khóa staging. Chép bản sao vào trình quản lý mật khẩu.

**2. `infra/compose.prod.yml` (rút gọn, các service dùng chung khối `x-common`)**

```yaml
name: ph-prod
x-common: &common
  restart: unless-stopped
  stop_grace_period: 20s
  logging: { driver: json-file, options: { max-size: "10m", max-file: "5" } }
  labels: { autoheal: "true" }
services:
  # cloudflared không nằm ở đây: chạy trong project ph-edge (S2-06), dùng chung cho staging và prod
  caddy:
    <<: *common
    image: ghcr.io/<owner>/ph-caddy:${SHA}
    read_only: true
    tmpfs: [ /data, /config ]
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]       # nghe :80 trong mạng nội bộ
    environment: { APP_ORIGIN: "https://app.pethealth.example" }
    healthcheck: { test: ["CMD", "wget", "-qO-", "http://localhost/healthz-caddy"], interval: 30s, retries: 3 }
    networks:
      ph_edge: { aliases: [caddy] }
      app: {}
    deploy: { resources: { limits: { memory: 128m } } }
  api:
    <<: *common
    image: ghcr.io/<owner>/ph-app:${SHA}
    command: ["api"]
    user: "10001:10001"
    read_only: true
    tmpfs: [ /tmp ]
    cap_drop: [ALL]
    env_file: [ /srv/pethealth/secrets/api.env ]
    environment: { NODE_ENV: production, APP_ORIGIN: "https://app.pethealth.example", DB_POOL_MAX: "10" }
    volumes: [ "/srv/pethealth/media:/data/media:ro" ]
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 15s
      timeout: 3s
      retries: 3
      start_period: 20s
    depends_on: { postgres: { condition: service_healthy } }
    networks: [app, db]
    deploy: { resources: { limits: { memory: 512m } } }
  worker:
    <<: *common
    image: ghcr.io/<owner>/ph-app:${SHA}
    command: ["worker"]
    user: "10001:10001"
    cap_drop: [ALL]
    env_file: [ /srv/pethealth/secrets/worker.env ]
    environment: { NODE_ENV: production, APP_ORIGIN: "https://app.pethealth.example", WORKER_DB_POOL_MAX: "5" }
    volumes: [ "/srv/pethealth/media:/data/media" ]
    healthcheck:   # heartbeat ghi /tmp/alive mỗi 30 s; quá 90 s là không khỏe
      test: ["CMD-SHELL", "test $$(( $$(date +%s) - $$(stat -c %Y /tmp/alive) )) -lt 90"]
      interval: 30s
      retries: 3
      start_period: 30s
    networks: [db, smtp-out]
    deploy: { resources: { limits: { memory: 768m } } }
  postgres:
    <<: *common
    image: postgres:16@sha256:<digest>
    stop_grace_period: 60s
    command: ["postgres", "-c", "shared_buffers=512MB", "-c", "max_connections=50",
              "-c", "idle_in_transaction_session_timeout=10s"]
    env_file: [ /srv/pethealth/secrets/postgres.env ]
    volumes: [ "/srv/pethealth/pgdata:/var/lib/postgresql/data" ]
    shm_size: 256m
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"], interval: 10s, timeout: 3s, retries: 5 }
    networks: [db]
    deploy: { resources: { limits: { memory: 1536m } } }
  autoheal:
    image: willfarrell/autoheal:<phiên bản ghim>
    restart: unless-stopped
    environment: { AUTOHEAL_CONTAINER_LABEL: autoheal, AUTOHEAL_INTERVAL: "15" }
    volumes: [ "/var/run/docker.sock:/var/run/docker.sock" ]
    network_mode: none
networks:
  ph_edge: { external: true }    # tạo ở S2-06: docker network create ph_edge
  app: { internal: true }
  db: { internal: true }
  smtp-out: {}
```

- `statement_timeout = 5s` đặt theo role để không chặn migration: `ALTER ROLE app_rw SET statement_timeout = '5s'; ALTER ROLE app_worker SET statement_timeout = '5s';` (thêm vào migration khởi tạo role nếu S1-01 chưa có).
- Không publish cổng nào ra host (`ports:` không xuất hiện trong file). Postgres không bật cổng ngoài mạng `db`.
- Docker tự chạy lại stack khi máy khởi động: `systemctl is-enabled docker` = `enabled`.

**3. `infra/Caddyfile`**

```
{
  auto_https off
  admin off
}
:80 {
  encode zstd gzip
  header {
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "geolocation=(), microphone=()"
    -Server
  }
  respond /healthz-caddy 200
  handle /api/* {
    request_body { max_size 6MB }
    reverse_proxy api:3000
  }
  handle /media/* { reverse_proxy api:3000 }   # giữ nguyên Cache-Control: private của api
  handle /assets/* {
    header Cache-Control "public, max-age=31536000, immutable"
    root * /srv/www
    file_server
  }
  handle {
    header Cache-Control "no-cache"
    root * /srv/www
    try_files {path} /index.html
    file_server
  }
}
```

**4. Ingress tunnel (`infra/cloudflared/config.yml`)**

```yaml
tunnel: <tunnel-uuid>
credentials-file: /etc/cloudflared/creds.json
ingress:
  - hostname: app.pethealth.example
    service: http://caddy:80
  - hostname: staging.pethealth.example
    service: http://caddy-staging:80     # rule của S2-06
  - service: http_status:404
```

Tunnel dùng chung với staging: `cloudflared` chạy trong compose project riêng `ph-edge` (`infra/compose.edge.yml`, [S2-06](S2-06-server-staging.md)) trên mạng external `ph_edge`. Ở prod chỉ cần nối `caddy` của `ph-prod` vào `ph_edge` với alias `caddy` và thêm rule `app.pethealth.example` vào `cloudflared/config.yml`.

**5. UPS và NUT**

1. `apt install nut`; `/etc/nut/nut.conf`: `MODE=standalone`.
2. `/etc/nut/ups.conf`: `[ups] driver = usbhid-ups  port = auto`.
3. `/etc/nut/upsmon.conf`: `MONITOR ups@localhost 1 upsmon <mật khẩu> primary`, `SHUTDOWNCMD "/sbin/shutdown -h +0"`, `FINALDELAY 5`.
4. Khi UPS báo pin yếu (`LB`), `upsmon` tắt máy; systemd dừng Docker, container nhận `SIGTERM` theo `stop_grace_period` (Postgres 60 s để checkpoint).
5. BIOS: bật "Restore on AC power loss = Power On" để máy tự lên khi có điện lại.

**6. `infra/ops/status.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
P=ph-prod
echo "== Container"; docker compose -p $P ps --format 'table {{.Service}}\t{{.State}}\t{{.Health}}'
echo "== Ổ đĩa";     df -h /srv/pethealth | tail -1; du -sh /srv/pethealth/{pgdata,media}
echo "== SMART";     smartctl -H /dev/nvme0n1 | grep -i result
echo "== Job lỗi 24h"
docker compose -p $P exec -T postgres psql -U postgres -d pethealth -tAc \
  "SELECT name, count(*) FROM pgboss.job WHERE state='failed' AND completed_on > now() - interval '24 hours' GROUP BY name"
```

In cảnh báo `!!` khi ổ dùng > 80% hoặc SMART khác `PASSED`. Thoát mã 1 nếu có container không `healthy`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] `docker compose -p ph-prod ps`: 6 container `running`, 5 container có healthcheck ở trạng thái `healthy` (NFR-REL-001).
- [ ] `docker network inspect ph-prod_app ph-prod_db` có `"Internal": true`; từ `api` không ra được Internet, từ `worker` kết nối được `smtp.gmail.com:465`.
- [ ] `ss -tlnp` trên host không có cổng nào của stack; `ufw status` = `deny (incoming)`.
- [ ] `curl -sI http://caddy/` trong mạng `ph_edge` trả đủ CSP đúng chuỗi SAD §4.1.4, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; không có header `Server` (G-10).
- [ ] `/assets/*` có `immutable`; `index.html` có `no-cache`; `/media/*` giữ `Cache-Control: private, max-age=900`.
- [ ] `SHOW shared_buffers` = `512MB`, `max_connections` = `50`; `SHOW statement_timeout` với role `app_rw` = `5s`.
- [ ] Tệp trong `/srv/pethealth/secrets` quyền `600`, chủ `root`; `git grep` không thấy giá trị bí mật nào (NFR-SEC-010).
- [ ] `ops/status.sh` chạy hết trong < 10 s và in đủ 4 mục.

## Kiểm thử

1. **Tự phục hồi:** `docker compose -p ph-prod exec api kill -STOP 1` → sau ≤ 60 s (3 × 15 s + chu kỳ autoheal) `api` được khởi động lại và `healthy`. Lặp lại với `worker` (xóa `/tmp/alive` và dừng heartbeat) → khởi động lại trong ≤ 2 phút.
2. **Khởi động lại máy:** `sudo reboot` → trong ≤ 3 phút mọi container `healthy`, `https://app.pethealth.example/readyz` trả 200 (sau S7-02).
3. **Tắt máy qua UPS:** `upsmon -c fsd` → máy tắt sạch; khởi động lại, log Postgres không có `database system was not properly shut down`.
4. **Giới hạn bộ nhớ:** `docker stats --no-stream` khớp giới hạn 1,5 GB / 512 MB / 768 MB; tải lên 10 ảnh HEIC 5 MB liên tiếp không làm `worker` bị OOM-kill (`docker inspect -f '{{.State.OOMKilled}}'` = `false`).
5. **CSP:** mở app trên Chrome, DevTools Console không có lỗi `Refused to ...` ở Dashboard, Hồ sơ, Sổ y tế (có ảnh), biểu đồ cân nặng.

## Ghi chú

- `autoheal` cần Docker socket; đặt `network_mode: none` để container này không có mạng.
- Khi chưa phát hành (trước S7-06) có thể đặt `app.pethealth.example` sau Cloudflare Access giống staging, gỡ ra ở S7-06.
