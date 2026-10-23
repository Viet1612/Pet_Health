const KEY = 'ph.selectedPetId';

/** Thú cưng đang chọn, nhớ theo thiết bị (FR-PET-007, SAD §2.1.2). */
export function getSelectedPetId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSelectedPetId(petId: string | null): void {
  try {
    if (petId) window.localStorage.setItem(KEY, petId);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Trình duyệt chặn localStorage: bỏ qua, chỉ mất tính năng nhớ lựa chọn.
  }
}
