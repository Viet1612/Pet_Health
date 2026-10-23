# S0-09 · CI GitHub Actions: lint, test, contract diff, audit, size-limit

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | NFR-MNT-003 (G-2), NFR-MNT-004 (G-17), NFR-PERF-003 (G-8), NFR-SEC-008 (G-12), SAD §1.2.2, §2.2.2, §4.1.4, §4.1.6, §4.4.3, UI Blueprint §3.3 |
| Phụ thuộc | [S0-03](S0-03-backend-skeleton.md), [S0-07](S0-07-web-shell.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu
Mỗi pull request chạy đủ các bước trước merge ở SAD §4.4.3 (trừ E2E và Schemathesis): lint + typecheck + `dependency-cruiser` → unit có coverage gate → integration Testcontainers → contract diff → quét bảo mật → `size-limit`. Đây là điều kiện của mốc M1 "CI xanh".

## Phạm vi
**Trong phạm vi:**
- `.github/workflows/ci.yml`, `.dependency-cruiser.cjs`, ngưỡng coverage Vitest, `apps/web/.size-limit.json`, `.github/dependabot.yml`.

**Ngoài phạm vi:**
- Build và đẩy image `ph-app`, `ph-caddy` lên GHCR sau merge → S2-06.
- E2E Playwright sau deploy staging → S4-06. Schemathesis đầy đủ → S7-05. ZAP → S7-04.

## Chi tiết kỹ thuật
1. **Workflow** `.github/workflows/ci.yml`: chạy trên `pull_request` và `push` vào `main`; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`; `permissions: contents: read`. Bước chuẩn bị chung: `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`. Các job nối tiếp theo `needs` đúng thứ tự SAD:
   | Job | `needs` | Lệnh |
   |---|---|---|
   | `lint` | — | `pnpm format:check` · `pnpm lint` · `pnpm typecheck` · `pnpm depcruise` |
   | `unit` | `lint` | `pnpm test:unit --coverage` (ngưỡng ở bước 3); tải `coverage/` lên artifact |
   | `integration` | `unit` | `pnpm test:integration` (Testcontainers `postgres:16`; runner `ubuntu-latest` có Docker) |
   | `contract` | `integration` | `pnpm openapi:gen && git diff --exit-code openapi.yaml` · `pnpm --filter @ph/api-client generate && git diff --exit-code packages/api-client` · trên PR: `oasdiff breaking` so với `openapi.yaml` của nhánh đích, `--fail-on ERR` |
   | `security` | `contract` | `pnpm audit --audit-level high` · OSV-Scanner quét `pnpm-lock.yaml` · `gitleaks/gitleaks-action` (checkout `fetch-depth: 0`) |
   | `size` | `security` | `pnpm --filter @ph/web build && pnpm --filter @ph/web size` |
   Bảo vệ nhánh `main`: bắt buộc 6 job trên xanh trước khi merge.
2. **`dependency-cruiser`** (`.dependency-cruiser.cjs`, script `depcruise` = `depcruise apps packages --config`), luật `severity: error` (SAD §2.2.2, UI Blueprint §3.3):
   | Tên luật | from | to (cấm) |
   |---|---|---|
   | `domain-no-adapters` | `^apps/api/src/modules/[^/]+/domain/` | `/(application\|adapters)/`, và các gói `fastify`, `kysely`, `pg`, `pg-boss` |
   | `domain-only-calendar` | `^apps/api/src/modules/[^/]+/domain/` | `^apps/api/src/platform/` trừ `platform/calendar/` |
   | `no-foreign-persistence` | `^apps/api/src/modules/([^/]+)/` | `^apps/api/src/modules/[^/]+/adapters/persistence/`, `pathNot: ^apps/api/src/modules/$1/` |
   | `web-not-api` | `^apps/web/` | `^apps/api/` |
   | `ui-pure` | `^apps/web/src/ui/` | `^apps/web/src/(api\|features)/` |
   | `feature-public-index` | `^apps/web/src/features/([^/]+)/` | `^apps/web/src/features/[^/]+/.+`, `pathNot: ^apps/web/src/features/($1/\|[^/]+/index\.tsx?$)` |
   | `api-client-standalone` | `^packages/api-client/` | `^apps/` |
   | `no-circular` | mọi | vòng phụ thuộc |
3. **Coverage gate** (Vitest, provider `v8`, NFR-MNT-003):
   ```ts
   coverage: { thresholds: {
     lines: 70,                                             // toàn hệ thống
     'apps/api/src/modules/*/domain/**': { lines: 90 },
     'apps/api/src/platform/calendar/**': { lines: 90 },
   } }
   ```
   Tách test bằng hậu tố: `*.test.ts` (unit) và `*.int.test.ts` (integration); script `test:unit`, `test:integration`.
4. **Size limit** (`apps/web/.size-limit.json`, NFR-PERF-003):
   ```json
   [ { "name": "JS ban đầu", "path": ["dist/assets/index-*.js"], "limit": "250 KB", "gzip": true },
     { "name": "CSS", "path": ["dist/assets/*.css"], "limit": "25 KB", "gzip": true } ]
   ```
   Khi có chunk Dashboard (S5-04) thì thêm chunk đó vào nhóm "JS ban đầu".
5. **Dependabot** (`.github/dependabot.yml`, SAD §4.1.4): `npm` (gốc monorepo), `github-actions`, `docker` (`/infra`), lịch hằng tuần, gom nhóm bản vá nhỏ.
6. Action bên thứ ba ghim theo SHA commit, không theo tag.

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] PR mở trên repo chạy đủ 6 job theo đúng thứ tự; tất cả xanh với mã của S0-01→S0-08.
- [ ] Thêm `import { Kysely } from 'kysely'` vào một tệp `modules/x/domain/` làm job `lint` đỏ với luật `domain-no-adapters`.
- [ ] Import `modules/a/adapters/persistence/...` từ `modules/b/` làm `lint` đỏ; import trong cùng mô-đun thì qua.
- [ ] Import từ `apps/api` trong `apps/web` làm `lint` đỏ.
- [ ] Coverage `platform/calendar` dưới 90% làm `unit` đỏ.
- [ ] Sửa schema một route mà không chạy `openapi:gen` làm `contract` đỏ; xóa một trường phản hồi bắt buộc làm `oasdiff breaking` đỏ.
- [ ] Một dependency có lỗ hổng High làm `security` đỏ; commit có chuỗi giống bí mật làm `gitleaks` đỏ.
- [ ] Bundle JS ban đầu > 250 KB gzip làm `size` đỏ.
- [ ] Thời gian chạy toàn pipeline ở S0 < 10 phút.

## Kiểm thử
- Kiểm từng tiêu chí "đỏ" bằng một PR thử chứa vi phạm, rồi đóng PR.
- Chạy `pnpm depcruise` local với tệp mẫu vi phạm cho từng luật ở bước 2.

## Ghi chú
- Ở S0 chưa có mô-đun nghiệp vụ; luật `dependency-cruiser` vẫn phải bật ngay để không phải sửa ngược về sau.
- Ngưỡng coverage áp dụng từ S0; khi một PR làm coverage tụt dưới ngưỡng thì thêm test, không hạ ngưỡng.
