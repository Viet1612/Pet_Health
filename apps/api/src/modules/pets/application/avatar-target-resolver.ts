import type { ClockPort } from '../../../platform/clock/clock.js';
import { avatarKey, TargetGoneError, type TargetResolver } from '../../media/index.js';
import type { PetRepository } from './ports.js';

/**
 * Nơi lưu ảnh đại diện và cách gắn vào thú cưng (chạy trong worker, kết nối app_worker).
 * Hai lần thay ảnh liên tiếp: ảnh xử lý xong sau cùng thắng; tệp của ảnh trước bị xóa.
 */
export function avatarTargetResolver(deps: {
  pets: PetRepository;
  clock: ClockPort;
}): TargetResolver {
  return {
    async finalKey(q, upload) {
      const pet = await deps.pets.findById(q, upload.ownerId, upload.targetId);
      return pet ? avatarKey(upload.ownerId, upload.targetId, upload.id) : null;
    },

    async onReady(trx, upload, key) {
      const current = await deps.pets.lockAvatarKey(trx, upload.ownerId, upload.targetId);
      if (!current) throw new TargetGoneError();
      await deps.pets.setAvatarKey(trx, upload.ownerId, upload.targetId, key, deps.clock.now());
      return current.avatarKey && current.avatarKey !== key ? [current.avatarKey] : [];
    },
  };
}
