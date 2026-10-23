// Sinh openapi.yaml ở gốc repo từ schema Zod của route (SAD P2). Không kết nối DB.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildApp } from '../src/app.js';

const target = fileURLToPath(new URL('../../../openapi.yaml', import.meta.url));

const app = await buildApp({
  checkDb: () => Promise.resolve(),
  lifecycle: { shuttingDown: false },
});
await app.ready();
await writeFile(target, app.swagger({ yaml: true }));
await app.close();
process.stdout.write(`openapi: ${target}\n`);
