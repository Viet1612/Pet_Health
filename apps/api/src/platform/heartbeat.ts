import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_MAX_AGE_MS = 90_000;

export async function writeHeartbeat(file: string, now: number = Date.now()): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, String(now));
}

/** Ghi heartbeat ngay rồi mỗi 30 s. Trả hàm dừng. */
export function startHeartbeat(file: string, onError: (error: unknown) => void): () => void {
  const beat = (): void => {
    writeHeartbeat(file).catch(onError);
  };
  beat();
  const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  return () => {
    clearInterval(timer);
  };
}

/** Heartbeat còn mới (tuổi < 90 s) thì worker coi là khỏe. */
export async function isHeartbeatFresh(file: string, now: number = Date.now()): Promise<boolean> {
  try {
    const { mtimeMs } = await stat(file);
    return now - mtimeMs < HEARTBEAT_MAX_AGE_MS;
  } catch {
    return false;
  }
}
