# S0-01 · Khởi tạo monorepo pnpm, lint, tsconfig, pre-commit

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | AD-001, AD-002, NFR-SEC-007, NFR-SEC-010, SAD §4.1.4, §4.1.6, §4.4.2 |
| Phụ thuộc | — |
| Ước lượng | 0,5 |
| Màn hình Figma | — |

## Mục tiêu
Có một monorepo pnpm đúng cấu trúc SAD §4.4.2, TypeScript strict, ESLint + Prettier chặn sẵn các lỗi bảo mật đã biết (XSS qua `dangerouslySetInnerHTML`, SQL injection qua `sql.raw`) và `gitleaks` chạy ở pre-commit. Mọi task sau chỉ thêm mã vào khung này.

## Phạm vi
**Trong phạm vi:**
- Cây thư mục `apps/web`, `apps/api`, `packages/api-client`, `packages/email-templates`, `infra/` (mỗi package có `package.json`, `tsconfig.json`, `src/index.ts` rỗng).
- `tsconfig.base.json` strict, ESLint flat config, Prettier, EditorConfig, `.gitattributes`.
- Vitest ở gốc (chạy được với 0 test), script chung `lint`, `typecheck`, `test`, `format`.
- Husky + lint-staged + `gitleaks` ở pre-commit; Node 22 LTS được ghim.

**Ngoài phạm vi:**
- `compose.dev.yml`, `.env.example` → [S0-02](S0-02-dev-environment.md).
- Mã Fastify, Kysely → [S0-03](S0-03-backend-skeleton.md); Vite/React → [S0-07](S0-07-web-shell.md).
- Luật `dependency-cruiser` và workflow CI → [S0-09](S0-09-ci-pipeline.md).

## Chi tiết kỹ thuật
1. **Cấu trúc gốc** (theo SAD §4.4.2):
   ```
   package.json              # private, "packageManager": "pnpm@<bản 10.x cụ thể>", engines.node ">=22 <23"
   pnpm-workspace.yaml       # packages: ["apps/*", "packages/*"]
   .nvmrc                    # 22
   tsconfig.base.json
   eslint.config.js
   .prettierrc.json  .prettierignore  .editorconfig  .gitattributes  .gitignore
   .gitleaks.toml
   vitest.config.ts          # test.projects: ["apps/*", "packages/*"]
   apps/web/  apps/api/  packages/api-client/  packages/email-templates/  infra/  docs/
   ```
   Tên package: `@ph/web`, `@ph/api`, `@ph/api-client`, `@ph/email-templates`. Bật `corepack enable` để mọi máy dùng đúng bản pnpm.
2. **`tsconfig.base.json`**: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `target: "ES2023"`, `skipLibCheck: true`. `apps/api` dùng `module/moduleResolution: "NodeNext"`; `apps/web` và `packages/*` dùng `"Bundler"`.
3. **ESLint** (`eslint.config.js`, flat config): `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier` (tắt luật trùng Prettier). Luật bắt buộc:
   ```js
   // Mọi package
   'no-restricted-syntax': ['error', {
     selector: "CallExpression[callee.object.name='sql'][callee.property.name='raw']",
     message: 'Cấm sql.raw (SAD §4.1.4). Dùng truy vấn tham số của Kysely.',
   }],
   // apps/web, packages/email-templates
   'react/no-danger': 'error',
   // apps/web
   'no-restricted-imports': ['error', { paths: ['luxon', 'date-fns-tz'], patterns: ['@ph/api', '**/apps/api/**'] }],
   'no-restricted-globals': ['error', { name: 'fetch', message: 'Gọi API qua src/api/ (UI Blueprint §3.3).' }],
   // apps/api
   'no-console': 'error',
   ```
   Ngoại lệ `fetch` chỉ cho `apps/web/src/api/**`. Trường hợp thật sự cần `sql.raw` với hằng số (không phải dữ liệu người dùng) phải dùng `// eslint-disable-next-line no-restricted-syntax -- <lý do>`.
4. **Prettier**: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: "all"`, plugin `prettier-plugin-tailwindcss`. Script `format` và `format:check`.
5. **`.gitattributes`**: `* text=auto eol=lf` (máy dev là Windows; tránh CRLF trong shell script và Dockerfile).
6. **`.gitignore`**: `node_modules/`, `dist/`, `coverage/`, `.data/`, `.env`, `*.env`, `!*.env.example`, `playwright-report/`, `test-results/`.
7. **Pre-commit**: `husky` + `lint-staged`.
   - `lint-staged`: `*.{ts,tsx}` → `eslint --fix` + `prettier --write`; `*.{json,md,yml,yaml,css}` → `prettier --write`.
   - Sau đó chạy `gitleaks git --pre-commit --staged --redact --config .gitleaks.toml`. Nếu máy chưa cài `gitleaks` thì hook dừng với thông báo hướng dẫn cài (Windows: `winget install gitleaks`), không bỏ qua âm thầm.
   - `.gitleaks.toml` kế thừa luật mặc định (`[extend] useDefault = true`) và allowlist đúng các tệp `*.env.example` (giá trị dev giả).
8. **Script gốc** (`package.json`): `lint` (`eslint .`), `typecheck` (`pnpm -r typecheck`, mỗi package chạy `tsc --noEmit`), `test` (`vitest run`), `format:check`, `prepare` (`husky`).

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] `pnpm install` trên máy sạch (Node 22) thành công; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` đều thoát mã 0.
- [ ] Cây thư mục khớp SAD §4.4.2; 4 package có tên `@ph/*` và nhìn thấy nhau qua `workspace:*`.
- [ ] Một tệp `.tsx` có `dangerouslySetInnerHTML` làm `pnpm lint` báo lỗi `react/no-danger`.
- [ ] Một tệp `.ts` gọi `sql.raw(x)` làm `pnpm lint` báo lỗi với thông điệp tiếng Việt ở trên.
- [ ] Trong `apps/web`, `import { DateTime } from 'luxon'` và gọi `fetch()` ngoài `src/api/` đều bị ESLint chặn.
- [ ] Commit một tệp chứa chuỗi giống khóa bí mật (ví dụ AWS key mẫu) bị pre-commit chặn; commit `*.env.example` với giá trị dev giả thì qua.
- [ ] Tệp mới tạo trên Windows được commit với LF.

## Kiểm thử
- Không có test tự động riêng. Kiểm thủ công 6 tiêu chí cuối bằng các tệp mẫu tạm, rồi xóa tệp mẫu.
- `pnpm test` phải chạy được với cấu hình `projects` ngay cả khi chưa có tệp test (`passWithNoTests: true`).

## Ghi chú
- Luật ESLint chỉ bắt được cú pháp `sql.raw(...)`; review vẫn cần kiểm `sql` template có nội suy dữ liệu người dùng qua `sql.ref`/`sql.id`.
- Phiên bản pnpm và Node ghim cụ thể khi khởi tạo; Dependabot ([S0-09](S0-09-ci-pipeline.md)) đề xuất nâng cấp.
