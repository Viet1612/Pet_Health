# S0-01 · Khởi tạo monorepo pnpm, lint, tsconfig, pre-commit — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-01](../tasks/S0-01-monorepo.md) |
| Trạng thái | Xong, chưa commit |
| Ngày hoàn thành | 2026-10-23 |
| Commit | — |

## Kết quả

Monorepo pnpm có 4 package `@ph/web`, `@ph/api`, `@ph/api-client`, `@ph/email-templates`, TypeScript strict, ESLint chặn các lỗi bảo mật đã biết, Prettier, Vitest và hook pre-commit chạy `lint-staged` + `gitleaks`.

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| `pnpm install`, `lint`, `typecheck`, `test`, `format:check` thoát mã 0 | Đạt |
| 4 package `@ph/*` đúng cấu trúc SAD §4.4.2, thấy nhau qua `workspace:*` | Đạt |
| `dangerouslySetInnerHTML` bị ESLint chặn | Đạt (`react/no-danger`) |
| `sql.raw(x)` bị ESLint chặn với thông điệp tiếng Việt | Đạt |
| Trong `apps/web`: `import 'luxon'` và `fetch()` ngoài `src/api/` bị chặn | Đạt; trong `src/api/` được phép |
| Commit tệp chứa khóa bí mật bị chặn; `*.env.example` thì qua | Đạt (`leaks found: 1` / `no leaks found`) |
| Tệp tạo trên Windows được commit với LF | Đạt |

Kiểm bằng tệp mẫu tạm (đã xóa); hook được chạy trực tiếp, không tạo commit thử.

## Tệp đã tạo

- Gốc: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json` (cho tệp cấu hình ở gốc), `eslint.config.js`, `vitest.config.ts`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.gitleaks.toml`, `.nvmrc`, `.husky/pre-commit`
- `apps/api`, `apps/web`, `packages/api-client`, `packages/email-templates`: `package.json`, `tsconfig.json`, `src/index.ts`
- `infra/.gitkeep`
- `README.md`: Prettier thêm dòng trống cuối tệp

## Phiên bản đã ghim

| Công cụ | Phiên bản |
|---|---|
| Node | 22.23.4 (ServBay) |
| pnpm | 12.15.0 |
| TypeScript | 5.9.3 |
| ESLint | 9.39.5 |
| typescript-eslint | 8.72.0 |
| Prettier | 3.9.10 |
| Vitest | 5.0.5 |
| Husky / lint-staged | 9.1.7 / 17.6.0 |

## Khác với file task

- pnpm 12.15.0 thay vì 10.x: bản corepack tải về trên máy.
- ESLint giữ bản 9 để tương thích plugin React.
- Thêm `tsconfig.json` ở gốc để ESLint có thông tin kiểu cho `vitest.config.ts`.
- Hook tự tìm `gitleaks.exe` trong thư mục cài của winget khi lệnh `gitleaks` chưa có trong PATH.

## Ghi chú môi trường

- Node đang dùng là bản của ServBay (`C:\ServBay\bin`). Bash chỉ gọi được `node`; `pnpm` có sau khi chạy `corepack.cmd enable`.
- `pnpm lint` in cảnh báo "react package is not installed": bình thường, React được cài ở [S0-07](../tasks/S0-07-web-shell.md).
