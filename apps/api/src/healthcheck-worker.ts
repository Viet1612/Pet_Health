// Healthcheck Docker cho worker: exit 0 khi tệp heartbeat có tuổi < 90 s.
import { isHeartbeatFresh } from './platform/heartbeat.js';

const file = process.env.HEARTBEAT_FILE ?? '/tmp/alive';
process.exit((await isHeartbeatFresh(file)) ? 0 : 1);
