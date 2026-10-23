# S0-10 · Dockerfile app (libvips + libheif) và Caddy

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — (nền cho US-012, US-033) |
| Yêu cầu | AD-001, AD-004, AD-007, FR-PET-005, FR-VIS-005, SAD §2.0, §2.1.1, §2.2.4, §4.1.5, §4.2.2 |
| Phụ thuộc | [S0-03](S0-03-backend-skeleton.md), [S0-07](S0-07-web-shell.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu
Hai image chạy không root: `ph-app` (một image, 3 lệnh `api` / `worker` / `migrate`) có `sharp` dùng libvips tự build kèm libheif + libde265 để giải mã HEIC từ iPhone; `ph-caddy` chứa bundle SPA và Caddyfile cơ bản. Làm sớm để giảm rủi ro R2. Kết thúc task, một request đi trọn trình duyệt → Caddy → API → DB trên máy dev.

## Phạm vi
**Trong phạm vi:**
- `infra/Dockerfile`, `infra/Dockerfile.caddy`, `infra/Caddyfile`, `.dockerignore`, `infra/docker-entrypoint.sh`.
- Profile `full` trong `infra/compose.dev.yml` chạy `api`, `worker`, `caddy` từ image vừa build.
- Ảnh HEIC mẫu `apps/api/test/fixtures/iphone-sample.heic` và lệnh kiểm chuyển đổi trong container.

**Ngoài phạm vi:**
- CSP và header bảo mật khác (SAD §4.1.4), `read_only`, `cap_drop`, `autoheal`, compose production → S7-01.
- Pipeline xử lý ảnh (`media.process`) → S2-02. Build và đẩy GHCR → S2-06.

## Chi tiết kỹ thuật
1. **`infra/Dockerfile`** (multi-stage, base `node:22-bookworm-slim` ghim digest):
   1. `vips-build`: cài `build-essential cmake meson ninja-build pkg-config` + header (`libglib2.0-dev libexpat1-dev libjpeg62-turbo-dev libpng-dev libexif-dev liblcms2-dev`). Build từ source, phiên bản ghim bằng `ARG` và kiểm `sha256` của tarball:
      - `libde265` (decoder HEVC).
      - `libheif` bằng CMake, bật `libde265`, tắt encoder x265 và các plugin không cần (`-DWITH_X265=OFF -DWITH_EXAMPLES=OFF`).
      - `libvips` bằng Meson, `-Dheif=enabled`, cài vào `/usr/local`. Phiên bản ≥ mức tối thiểu mà bản `sharp` đang ghim yêu cầu (trường `config.libvips` trong `package.json` của `sharp`).
   2. `deps`: `corepack enable`, `pnpm fetch` theo `pnpm-lock.yaml`, `pnpm install --frozen-lockfile --offline`. Cài `sharp` với libvips hệ thống: copy `/usr/local` từ `vips-build`, đặt `SHARP_FORCE_GLOBAL_LIBVIPS=1`; `sharp` được build từ source nên `node-gyp` và `node-addon-api` phải có trong dependency của `@ph/api`.
   3. `build`: `pnpm --filter @ph/api build` (tsc → `dist/`), rồi `pnpm --filter @ph/api deploy --prod /out` (pnpm 10 cần `inject-workspace-packages=true` hoặc `--legacy`).
   4. `runtime`: `node:22-bookworm-slim`; cài thư viện chạy (`libglib2.0-0 libexpat1 libjpeg62-turbo libpng16-16 libexif12 liblcms2-2 tini`), copy `/usr/local/lib` từ `vips-build` + `ldconfig`, copy `/out` vào `/app`. `ENV NODE_ENV=production`. `USER node` (uid 1000). `ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]`, `CMD ["api"]`, `EXPOSE 3000`.
   5. Bước kiểm ở cuối build (fail build nếu sai): copy tạm `iphone-sample.heic` vào stage kiểm và giải mã thật, vì `heif` có trong `sharp.format` cả ở bản prebuilt (chỉ AVIF) nên không đủ để chứng minh giải mã được HEVC:
      ```sh
      node -e "const s=require('sharp'); console.log(s.versions); s('/tmp/iphone-sample.heic').jpeg().toBuffer().then(b=>console.log('ok',b.length)).catch(e=>{console.error(e);process.exit(1)})"
      ```
2. **`infra/docker-entrypoint.sh`**: `api` → `exec node dist/main-api.js`; `worker` → `exec node dist/main-worker.js`; `migrate` → `exec node dist/main-migrate.js`; `healthcheck-worker` → `exec node dist/healthcheck-worker.js`; lệnh khác → báo lỗi, exit 64. Healthcheck `api` dùng `node -e` gọi `http://localhost:3000/api/v1/readyz` (image không có `curl`).
3. **`infra/Dockerfile.caddy`**:
   - Stage `web-build` (`node:22-bookworm-slim`): `pnpm install --frozen-lockfile`, `pnpm --filter @ph/web build`.
   - Stage cuối `caddy:2-alpine` ghim digest: copy `infra/Caddyfile` → `/etc/caddy/Caddyfile`, `apps/web/dist` → `/srv/www`. Chạy user không root (`USER 1000:1000`) nên lắng nghe cổng **8080**; `XDG_DATA_HOME=/tmp/caddy-data`, `XDG_CONFIG_HOME=/tmp/caddy-config`.
4. **`infra/Caddyfile`** (SAD §2.0, §2.1.1, §3.2.2):
   ```caddyfile
   {
     admin off
     auto_https off            # TLS kết thúc ở Cloudflare
   }
   :8080 {
     encode zstd gzip
     handle /api/* {
       request_body { max_size 6MB }   # ảnh ≤ 5 MB + phần multipart
       reverse_proxy api:3000
     }
     handle /media/* {
       reverse_proxy api:3000
     }
     handle {
       root * /srv/www
       @assets path /assets/*
       header @assets Cache-Control "public, max-age=31536000, immutable"
       @notAssets not path /assets/*
       header @notAssets Cache-Control "no-cache"
       try_files {path} /index.html
       file_server
     }
   }
   ```
   `/api/*` giữ `Cache-Control: no-store` do API đặt; `/media/*` giữ `private, max-age=900` do API đặt. Header `CF-Connecting-IP` được chuyển nguyên tới `api`.
5. **`.dockerignore`**: `**/node_modules`, `**/dist`, `.git`, `docs`, `**/.env`, `.data`, `coverage`, `playwright-report`.
6. **Profile `full`** trong `infra/compose.dev.yml`: `migrate` (chạy một lần), `api`, `worker` (`build: { context: .., dockerfile: infra/Dockerfile }`, `command: api|worker|migrate`, `env_file: ../apps/api/.env` với `DATABASE_URL` trỏ `postgres:5432`), `caddy` (`ports: ["127.0.0.1:8080:8080"]`). Lệnh: `docker compose -f infra/compose.dev.yml --profile full up -d --build`.

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] `docker build -f infra/Dockerfile -t ph-app:dev .` thành công trên máy dev và trong runner GitHub `ubuntu-latest`; bước kiểm giải mã `iphone-sample.heic` in `ok`.
- [ ] Trong container `ph-app`, chuyển `iphone-sample.heic` sang JPEG bằng `sharp` thành công, ảnh ra đúng kích thước gốc.
- [ ] `docker run --rm ph-app:dev id -u` không trả 0; `ph-caddy` cũng không chạy root.
- [ ] `docker run ph-app:dev foo` thoát mã 64 với thông báo lệnh không hợp lệ.
- [ ] Với profile `full`: `curl -i http://localhost:8080/api/v1/readyz` → 200 và `Cache-Control: no-store` (request đi Caddy → API → DB).
- [ ] `curl -i http://localhost:8080/pets/abc` → 200 trả `index.html` với `Cache-Control: no-cache`; tệp `/assets/index-<hash>.js` có `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Mở `http://localhost:8080/` trên trình duyệt thấy AppShell của [S0-07](S0-07-web-shell.md).
- [ ] Body 7 MB gửi tới `/api/v1/...` bị Caddy từ chối 413.
- [ ] `docker stop` container `api` thoát êm trong ≤ 20 s (tini chuyển `SIGTERM`, [S0-03](S0-03-backend-skeleton.md) bước 9).
- [ ] Image `ph-app` không chứa `build-essential`, mã nguồn TypeScript hay `devDependencies`.

## Kiểm thử
- **Smoke script** `infra/scripts/smoke-images.sh` (chạy tay và trong CI ở S2-06): build 2 image, chạy kiểm HEIC trong container, bật profile `full`, kiểm 4 tiêu chí `curl` ở trên, rồi `down -v`.
- Ảnh HEIC thật từ iPhone (HEVC) được dùng thêm ở test tích hợp pipeline ảnh của S2-02.

## Ghi chú
- Cổng nội bộ của Caddy là 8080 (không phải 80 như SAD §2.0) vì container không root và `cap_drop: [ALL]` ở S7-01 không cho bind cổng < 1024; `cloudflared` trỏ tới `caddy:8080`.
- Bản `sharp` cài sẵn (prebuilt) không giải mã HEVC (SAD §2.2.4); nếu `sharp` lặng lẽ dùng bản prebuilt thì bước kiểm ở 1.5 sẽ fail. Ảnh mẫu phải là HEIC mã HEVC chụp từ iPhone, không phải AVIF.
