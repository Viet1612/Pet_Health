import { m } from '../../i18n';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { PetAvatar } from './PetAvatar';
import type { Pet } from './queries';

/** Bước chọn thú cưng trước khi thêm nhanh khi Dashboard đang lọc "Tất cả" (UXD-004). */
export function PetPickDialog({
  pets,
  onPick,
  onClose,
}: {
  pets: Pick<Pet, 'id' | 'name' | 'avatarThumbUrl'>[];
  onPick: (pet: { id: string; name: string }) => void;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog open onClose={onClose} title={m.dashboard.pickPet}>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {pets.map((pet) => (
          <li key={pet.id}>
            <button
              type="button"
              className="hover:bg-surface-2 flex min-h-14 w-full items-center gap-3 rounded-md px-3 text-left"
              onClick={() => {
                onPick(pet);
              }}
            >
              <PetAvatar pet={pet} size={32} />
              <span className="text-body truncate font-semibold">{pet.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  );
}
