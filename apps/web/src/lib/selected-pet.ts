const KEY = 'ph.selectedPetId';

const listeners = new Set<() => void>();
// Bản sao trong bộ nhớ: vẫn đổi được thú cưng khi trình duyệt chặn localStorage.
let memory: string | null = null;

/** Thú cưng đang chọn, nhớ theo thiết bị (FR-PET-007, SAD §2.1.2). */
export function getSelectedPetId(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function setSelectedPetId(petId: string | null): void {
  if (getSelectedPetId() === petId) return;
  memory = petId;
  try {
    if (petId) window.localStorage.setItem(KEY, petId);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Trình duyệt chặn localStorage: bỏ qua, chỉ mất tính năng nhớ lựa chọn.
  }
  for (const listener of listeners) listener();
}

/** Cho `useSyncExternalStore`: mọi component dùng thú cưng đang chọn cập nhật cùng lúc. */
export function subscribeSelectedPet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
