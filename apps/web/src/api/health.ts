const PROBE_TIMEOUT_MS = 3_000;

/** `GET /healthz` với timeout 3 s: dùng để biết đã có mạng lại (S6-03). */
export async function probeHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, PROBE_TIMEOUT_MS);
  try {
    const res = await fetch('/api/v1/healthz', { cache: 'no-store', signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
