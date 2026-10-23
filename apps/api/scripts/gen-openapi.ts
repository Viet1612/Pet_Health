// Sinh openapi.yaml ở gốc repo từ schema Zod của route (SAD P2). Không kết nối DB.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildApp } from '../src/app.js';
import { registerModules, type ModuleDeps } from '../src/modules/index.js';

// Chỉ cần đăng ký route để lấy schema; handler không bao giờ chạy nên deps để trống.
const stubDeps = { identity: {}, pets: {}, media: {}, healthRecords: {} } as unknown as ModuleDeps;

const target = fileURLToPath(new URL('../../../openapi.yaml', import.meta.url));

// nodeEnv production: route chỉ dùng cho test (/__test/*) không vào contract.
const app = await buildApp({
  appOrigin: 'https://app.pethealth.example',
  nodeEnv: 'production',
  checkDb: () => Promise.resolve(),
  lifecycle: { shuttingDown: false },
  registerRoutes: (api) => registerModules(api, stubDeps),
});
await app.ready();
await writeFile(target, app.swagger({ yaml: true }));
await app.close();
process.stdout.write(`openapi: ${target}\n`);
