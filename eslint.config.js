// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const noSqlRaw = {
  selector: "CallExpression[callee.object.name='sql'][callee.property.name='raw']",
  message: 'Cấm sql.raw (SAD §4.1.4). Dùng truy vấn tham số của Kysely.',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      'docs/',
      'infra/',
      // Sinh tự động bằng kysely-codegen
      'apps/api/src/platform/db/database.types.ts',
      // Sinh tự động bằng TanStack Router plugin
      'apps/web/src/routeTree.gen.ts',
      // Sinh tự động bằng openapi-typescript
      'packages/api-client/src/schema.d.ts',
    ],
  },

  // Mọi package
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-restricted-syntax': ['error', noSqlRaw],
    },
  },

  // Tệp cấu hình JS ở gốc: không có thông tin kiểu
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: globals.node, parserOptions: { projectService: false } },
  },

  // React: apps/web, packages/email-templates
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/email-templates/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/no-danger': 'error',
    },
  },

  // apps/web: không logic múi giờ ở client, không import backend, gọi API qua src/api/
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'luxon',
              message: 'Client không xử lý múi giờ (SAD P1). Dùng giá trị API trả về.',
            },
            {
              name: 'date-fns-tz',
              message: 'Client không xử lý múi giờ (SAD P1). Dùng giá trị API trả về.',
            },
          ],
          patterns: [
            {
              group: ['@ph/api', '**/apps/api/**'],
              message: 'Web chỉ gọi backend qua @ph/api-client.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Gọi API qua src/api/ (UI Blueprint §3.3).' },
      ],
    },
  },
  {
    files: ['apps/web/src/api/**/*.{ts,tsx}'],
    rules: { 'no-restricted-globals': 'off' },
  },

  // apps/api: log qua pino, không console
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'error' },
  },

  // Mô-đun nghiệp vụ lấy thời gian qua ClockPort (SAD P7), để test được bằng FakeClock
  {
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        noSqlRaw,
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Dùng clock.now() (ClockPort), không gọi new Date() trong mô-đun (SAD P7).',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Dùng clock.now() (ClockPort), không gọi Date.now() trong mô-đun (SAD P7).',
        },
      ],
    },
  },

  prettier,
);
