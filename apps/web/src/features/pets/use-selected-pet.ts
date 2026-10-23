import { useQuery } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';

import { getSelectedPetId, setSelectedPetId, subscribeSelectedPet } from '../../lib/selected-pet';
import { petsQuery, type Pet } from './queries';

/**
 * Thú cưng đang chọn (FR-PET-007). ID trong localStorage không còn trong danh sách → chọn con
 * đầu tiên và ghi lại.
 */
export function useSelectedPet(): {
  pets: Pet[] | undefined;
  selected: Pet | undefined;
  select: (petId: string) => void;
} {
  const { data: pets } = useQuery(petsQuery);
  const id = useSyncExternalStore(subscribeSelectedPet, getSelectedPetId, () => null);

  useEffect(() => {
    if (!pets) return;
    if (!id || !pets.some((p) => p.id === id)) setSelectedPetId(pets[0]?.id ?? null);
  }, [pets, id]);

  return {
    pets,
    selected: pets?.find((p) => p.id === id) ?? pets?.[0],
    select: setSelectedPetId,
  };
}
