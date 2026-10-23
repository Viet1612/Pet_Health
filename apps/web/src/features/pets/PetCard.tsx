import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

import { petSubline } from './format';
import { PetAvatar } from './PetAvatar';
import type { Pet } from './queries';

/** Thẻ thú cưng ở SCR-07: chạm → hồ sơ (SCR-08). */
export function PetCard({ pet }: { pet: Pet }) {
  return (
    <Link
      to="/pets/$petId"
      params={{ petId: pet.id }}
      className="bg-surface border-divider hover:bg-surface-2 duration-fast flex min-h-20 items-center gap-4 rounded-lg border p-4 transition-colors"
    >
      <PetAvatar pet={pet} size={64} />
      <span className="min-w-0 flex-1">
        <span className="text-h2 block truncate">{pet.name}</span>
        <span className="text-small text-text-muted block truncate">{petSubline(pet)}</span>
      </span>
      <ChevronRight size={20} aria-hidden className="text-text-muted shrink-0" />
    </Link>
  );
}
