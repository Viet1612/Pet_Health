// Gửi job `maintenance.daily` ngay (kiểm thử trên máy dev): `pnpm --filter @ph/api maintenance:run`.
// Worker đang chạy sẽ nhận và xử lý.
import { loadConfigOrExit } from '../src/config.js';
import { createBoss } from '../src/platform/queue/pg-boss.adapter.js';

const config = loadConfigOrExit();
const boss = createBoss(config.WORKER_DATABASE_URL, 'api', 1);
await boss.start();
const id = await boss.send('maintenance.daily', {});
process.stdout.write(`Đã gửi maintenance.daily (job ${String(id)})\n`);
await boss.stop({ graceful: false });
