import { Check } from 'lucide-react';

import { m } from '../../i18n';
import { cx } from '../../ui/cx';
import { PetAvatar } from '../pets';
import { MAX_POST_PETS, togglePet } from './composer';

/** Chip chọn thú cưng gắn vào bài (0–5, mặc định không chọn). Ẩn khi chưa có thú cưng. */
export function PetChips({
  pets,
  value,
  onChange,
}: {
  pets: { id: string; name: string; avatarThumbUrl: string | null }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  if (pets.length === 0) return null;
  const full = value.length >= MAX_POST_PETS;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-small mb-1 font-semibold">{m.social.composer.tagPets}</legend>
      <div className="flex flex-wrap gap-2">
        {pets.map((pet) => {
          const on = value.includes(pet.id);
          return (
            <button
              key={pet.id}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => {
                onChange(togglePet(value, pet.id));
              }}
              className={cx(
                'text-small inline-flex min-h-11 items-center gap-2 rounded-full border px-3 font-semibold',
                on
                  ? 'border-primary bg-primary-soft text-primary-soft-fg'
                  : 'border-border hover:bg-surface-2',
                !on && full && 'opacity-50',
              )}
            >
              {on ? <Check size={16} aria-hidden /> : <PetAvatar pet={pet} size={24} />}
              {pet.name}
            </button>
          );
        })}
      </div>
      {full && <p className="text-small text-text-muted">{m.social.composer.tagLimit}</p>}
    </fieldset>
  );
}
