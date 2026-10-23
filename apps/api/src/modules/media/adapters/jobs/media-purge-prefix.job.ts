import type { Logger } from 'pino';

import type { ObjectStoragePort } from '../../../../platform/storage/object-storage.port.js';
import type { MediaPurgePrefixJob } from '../../application/ports.js';
import { InvalidPurgePrefixError, purgePrefix } from '../../application/purge-prefix.js';

/** Handler pg-boss cho `media.purge-prefix`. Prefix sai mẫu: ghi log và bỏ (thử lại cũng vô ích). */
export function createMediaPurgePrefixHandler(deps: {
  storage: ObjectStoragePort;
  logger: Logger;
}) {
  return async (job: { data: MediaPurgePrefixJob }) => {
    try {
      await purgePrefix(deps.storage, job.data.prefix);
    } catch (error) {
      if (error instanceof InvalidPurgePrefixError) {
        deps.logger.error({ err: error }, 'media.purge-prefix: prefix không hợp lệ, bỏ qua');
        return;
      }
      throw error;
    }
  };
}
