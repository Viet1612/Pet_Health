/**
 * So khớp tên khi xác nhận xóa (SD-009): chuẩn hóa NFC, bỏ khoảng trắng đầu/cuối, không phân biệt
 * hoa thường; giữ dấu tiếng Việt ("mít" ≠ "mit"). Web dùng bản sao y hệt để bật nút.
 */
export const normalizeForConfirm = (s: string): string =>
  s.normalize('NFC').trim().toLocaleLowerCase('vi');

export const matchesConfirmName = (input: string, petName: string): boolean =>
  normalizeForConfirm(input) === normalizeForConfirm(petName);
