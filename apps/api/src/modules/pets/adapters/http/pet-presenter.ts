import { thumbKeyOf } from '../../../media/index.js';
import type { PetView } from '../../application/pet-view.js';
import type { PetDto } from './pets.schemas.js';

/** `Pet` trả về client: URL ảnh đại diện và thumbnail đã ký 15 phút (S2-03). */
export function toPetDto(view: PetView, signUrl: (key: string) => string): PetDto {
  const { avatarKey, ...rest } = view;
  return {
    ...rest,
    avatarUrl: avatarKey ? signUrl(avatarKey) : null,
    avatarThumbUrl: avatarKey ? signUrl(thumbKeyOf(avatarKey)) : null,
  };
}
