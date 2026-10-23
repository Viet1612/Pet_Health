import { processImage, type ProcessImageDeps } from '../../application/process-image.js';
import type { MediaProcessJob } from '../../application/ports.js';

/** Handler pg-boss cho `media.process`; lần thử cuối khi `retryCount ≥ retryLimit`. */
export function createMediaProcessHandler(deps: ProcessImageDeps) {
  return async (job: { data: MediaProcessJob; retryCount: number; retryLimit: number }) => {
    await processImage(deps, job.data.uploadId, job.retryCount >= job.retryLimit);
  };
}
