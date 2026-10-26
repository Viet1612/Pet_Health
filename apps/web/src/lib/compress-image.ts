// Nén ảnh ở trình duyệt trước khi tải lên: server chỉ nhận tệp ≤ 5 MB, nên ảnh lớn hơn được thu
// nhỏ (cạnh dài ≤ 3000 px) và lưu JPEG, giảm dần chất lượng tới khi vừa. Ảnh ≤ 5 MB gửi nguyên.
// Canvas không giữ EXIF nên vị trí GPS cũng bị bỏ; hướng ảnh đã được trình duyệt xoay đúng.

/** Giới hạn của server cho một tệp ảnh. */
export const SERVER_MAX_BYTES = 5 * 1024 * 1024;
/** Tệp gốc lớn hơn mức này không thử nén (tránh treo máy với tệp bất thường). */
export const PICK_MAX_BYTES = 50 * 1024 * 1024;

const MAX_EDGE = 3000;
const QUALITIES = [0.85, 0.75, 0.65, 0.55];

export class ImageTooLargeError extends Error {
  constructor() {
    super('Ảnh quá lớn và không nén được');
    this.name = 'ImageTooLargeError';
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

/**
 * Trả lại `file` nếu đã ≤ 5 MB; ngược lại nén thành JPEG ≤ 5 MB. Trình duyệt không đọc được định
 * dạng (ví dụ HEIC trên Chrome) hoặc nén vẫn quá lớn → `ImageTooLargeError`.
 */
export async function fitImageForUpload(file: File): Promise<File> {
  if (file.size <= SERVER_MAX_BYTES) return file;
  if (file.size > PICK_MAX_BYTES) throw new ImageTooLargeError();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageTooLargeError();
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageTooLargeError();
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of QUALITIES) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= SERVER_MAX_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
      return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
    }
  }
  throw new ImageTooLargeError();
}
