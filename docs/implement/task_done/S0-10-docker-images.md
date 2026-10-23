# S0-10 · Dockerfile app (libvips + libheif) và Caddy — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-10](../tasks/S0-10-docker-images.md) |
| Trạng thái | Xong (code), chưa build image |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `1e6818a` |

## Kết quả

- **`infra/Dockerfile` (ph-app):** multi-stage, base `node:22-bookworm-slim`.
  - `vips-build`: build từ source libde265 1.1.3, libheif 1.23.6 (bật libde265, tắt encoder và plugin không cần) và libvips 8.18.7 (`-Dheif=enabled`). Mỗi tarball được kiểm sha256.
  - `deps`: `pnpm fetch` rồi `install --offline`; `SHARP_FORCE_GLOBAL_LIBVIPS=1` để `sharp` build với libvips hệ thống.
  - `build`: `pnpm --filter @ph/api build` (tsc → `dist/`), rồi `pnpm deploy --prod --legacy /out`.
  - `heic-check`: giải mã `apps/api/test/fixtures/iphone-sample.heic` bằng `sharp`; lỗi thì build fail. Thiếu tệp thì in cảnh báo và bỏ qua.
  - `runtime`: chỉ thư viện chạy + `tini`, `USER node`, `ENTRYPOINT tini -- docker-entrypoint.sh`, `CMD api`, `HEALTHCHECK` gọi `/api/v1/readyz` bằng `node -e`.
- **`infra/docker-entrypoint.sh`:** `api` / `worker` / `migrate` / `healthcheck-worker`; lệnh khác → exit 64.
- **`infra/Dockerfile.caddy` (ph-caddy):** build SPA trong stage Node, stage cuối `caddy:2-alpine`, chạy user 1000 ở cổng 8080.
- **`infra/Caddyfile`:**
  - `/api/*` giới hạn body 6 MB, chuyển tới `api:3000`; `/media/*` chuyển tới `api:3000`.
  - SPA có fallback `index.html`; `/assets/*` cache 1 năm `immutable`, còn lại `no-cache`.
- **`.dockerignore`.**
- **Profile `full` trong `infra/compose.dev.yml`:**
  - `migrate` chạy một lần, rồi `api`, `worker`, `caddy` (`127.0.0.1:8080`).
  - Gọi DB ServBay qua `host.docker.internal`.
  - Script `pnpm docker:full`.
- **`apps/api`:**
  - script `build` + `tsconfig.build.json`: `dist/src/*` và `dist/migrations/*`, đúng đường dẫn migrator tìm.
  - Thêm `sharp` 0.35.5, `node-addon-api`, `node-gyp`; `pnpm-workspace.yaml` cho phép build `sharp`.
- **`apps/api/test/fixtures/README.md`:** mô tả ảnh HEIC mẫu cần thêm.

## Tiêu chí chấp nhận

Theo yêu cầu "cứ code đi", task này **chưa build image** (build libvips từ source mất nhiều phút). Đã kiểm: `docker compose config` hợp lệ, `pnpm --filter @ph/api build` ra đúng `dist/`, lint, typecheck, format, depcruise sạch.

| Tiêu chí | Kết quả |
|---|---|
| `docker build -f infra/Dockerfile` thành công; bước kiểm HEIC in `ok` | Chưa build. **Chưa có ảnh `iphone-sample.heic`** |
| Trong container chuyển HEIC → JPEG đúng kích thước | Chưa kiểm |
| Container không chạy root | Code xong (`USER node`, `USER 1000:1000`) |
| `docker run ph-app:dev foo` → exit 64 | Code xong |
| Profile `full`: `/api/v1/readyz` qua Caddy → 200, `no-store` | Chưa chạy |
| `/pets/abc` → `index.html` `no-cache`; `/assets/*` `immutable` | Code xong (Caddyfile) |
| Mở `http://localhost:8080/` thấy AppShell | Chưa chạy |
| Body 7 MB tới `/api/v1/...` → 413 từ Caddy | Code xong (`max_size 6MB`) |
| `docker stop api` thoát êm ≤ 20 s | Code xong (`tini`, `stop_grace_period: 20s`) |
| Image không chứa build-essential, mã TypeScript, devDependencies | Code xong (runtime chỉ copy `/out` + `/usr/local/lib`) |

## Việc cần làm để hoàn tất kiểm thử

1. Thêm ảnh HEIC thật (HEVC, chụp từ iPhone, < 1 MB, đã xóa GPS) vào `apps/api/test/fixtures/iphone-sample.heic`.
2. Chạy `pnpm docker:full`, rồi mở `http://localhost:8080`.
3. Nếu container không kết nối được DB ServBay qua `host.docker.internal`, có thể vì PostgreSQL của ServBay chỉ nghe `127.0.0.1`. Khi đó cần cho PostgreSQL nghe thêm địa chỉ mà Docker Desktop dùng, hoặc chạy DB dev bằng Docker.

## Khác với file task

- **Profile `full` không có service `postgres`** mà gọi DB ServBay qua `host.docker.internal` (theo lựa chọn ở S0-02).
- **Bước kiểm HEIC bỏ qua khi thiếu ảnh mẫu,** thay vì làm build fail, để build được khi chưa có ảnh.
- **Đường dẫn entrypoint là `dist/src/main-*.js`** (build giữ cấu trúc `src/` và `migrations/`).
- **Image Node và Caddy chưa ghim digest;** ghim ở S2-06 khi đưa lên staging.
- Cài thêm `python3` trong stage build cho `node-gyp`.
