# Pet Health

Ứng dụng web nhật ký sức khỏe thú cưng (cân nặng, sổ y tế, mốc nhắc, việc chăm sóc, dashboard) + bản tin ảnh (Giai đoạn 2, module `social`). Dự án cá nhân. Trả lời bằng tiếng Việt.

Tài liệu: `docs/requirements` (BRD, PRD, SRS) · `docs/design` (SAD, UI/UX, User Stories) · `docs/implement` (plan, tasks, task_done) · `docs/testing` · `docs/deploy/DEPLOY.md`.

## Stack

- **Monorepo pnpm**, Node 22, TypeScript 5.9, ESM.
- **API** `apps/api`: Fastify 5 + Zod 4 (`fastify-type-provider-zod`), Kysely, PostgreSQL 16 có RLS, pg-boss (job), Argon2id, pino.
  - Module trong `src/modules/<tên>/{domain,application,adapters/{http,persistence}}`; hạ tầng dùng chung ở `src/platform`.
  - Migration: `apps/api/migrations/YYYYMMDDHHMM_<tên>.ts`. Kiểu DB sinh ra ở `src/platform/db/database.types.ts`.
  - Lưu trữ ảnh: `STORAGE_DRIVER=disk|r2` (Cloudflare R2 qua S3 API).
- **Web** `apps/web`: React 19, Vite, TanStack Router + Query, Tailwind v4, i18n tự viết (`src/i18n`). Tính năng nằm trong `src/features/<tên>`.
- **Package:** `packages/api-client` (kiểu sinh từ `openapi.yaml`), `packages/email-templates` (React Email).
- **Test:** Vitest (unit, integration, IDOR dùng Testcontainers), Playwright (`e2e/`, project phone + tablet, axe).
- **Production:** Docker Compose (`infra/compose.prod.yml`): postgres, migrate, api, worker, caddy, cloudflared. Hiện chạy trên WSL2, domain `pet.vietdeptrai.io.vn`.

## Lệnh

```sh
pnpm dev:up            # Mailpit (http://localhost:8025)
pnpm dev               # api :3000 + worker + web :5173
pnpm db:migrate        # chạy migration
pnpm --filter @ph/api db:types                              # sinh lại kiểu DB sau khi đổi schema
pnpm openapi:gen && pnpm --filter @ph/api-client generate   # sau khi đổi API

pnpm lint && pnpm typecheck
pnpm test:unit                     # nhanh, không cần DB
pnpm test:integration              # cần Docker
pnpm --filter @ph/api test:idor    # IDOR + RLS, cần Docker
pnpm e2e                           # Playwright: tự bật API :3100, web :5174 trên DB pethealth_e2e; cần Mailpit
```

PostgreSQL dev chạy ở `127.0.0.1:5432` (ServBay), DB `pethealth` (E2E dùng `pethealth_e2e`). Đừng chạy `pnpm dev:reset` hay lệnh xóa DB khi chưa được yêu cầu.

## Quy ước code

- Theo đúng phong cách file xung quanh: tên, mật độ comment (tiếng Việt, ngắn), cấu trúc layer.
- Truy cập tài nguyên của người khác trả **404** (không lộ sự tồn tại). Endpoint mới có tài nguyên theo chủ sở hữu thì thêm case vào bộ IDOR.
- Lỗi API theo `problem+json` có `code`; thông báo cho người dùng map ở web (`to-user-message.ts`).
- Đổi schema luôn bằng **migration mới**, không sửa migration đã chạy; nhớ cập nhật chính sách RLS.
- Chuỗi giao diện đi qua i18n, không viết cứng.

## Commit

- Conventional commits, tiếng Anh, có mã task trong scope khi làm task: `feat(S1-03): …`, `fix(web): …`, `docs: …`, `test: …`.
- Sau mỗi task: ghi `docs/implement/task_done/<task>.md`, cập nhật `task_done/README.md` (điền hash commit của task trước), rồi commit.
- Pre-commit chạy lint-staged + **gitleaks**. Không dùng `--no-verify`. Hook báo "command line is too long" khi quá nhiều file → chia nhỏ commit.
- Chỉ commit những gì thuộc việc đang làm; không gom thay đổi khác của người dùng. Chỉ push khi được yêu cầu.

## Bí mật và môi trường

- **Không bao giờ** đưa secret vào repo, tài liệu, log hay commit message. `.env` đã gitignore; `.env.example` chỉ chứa giá trị dev giả.
- Mật khẩu superuser PostgreSQL (ServBay) chỉ truyền qua `PGPASSWORD` khi chạy lệnh, không ghi ra file.
- Tài khoản/credential E2E chỉ dùng cho dev, không dùng trên production.
- Secret production chỉ nằm ở `/srv/pethealth/secrets/*.env` (quyền 600, root). Người dùng tự nhập qua `infra/ops/setup-secrets.sh`; không tự tạo hay in giá trị secret.
- **Không tự deploy production.** Đưa lệnh cho người dùng chạy: `cd /opt/pethealth && bash infra/ops/deploy.sh`.
- Test trên production chỉ dùng tài khoản test; không chạy migration/rollback, load test, quét bảo mật hay xóa dữ liệu hàng loạt khi chưa được cho phép.
