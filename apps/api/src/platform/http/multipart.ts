/** Ảnh tối đa 5 MB (FR-VIS-005). Caddy chặn body > 6 MB trước khi tới API. */
export const MAX_UPLOAD_BYTES = 5_242_880;

/** Giới hạn @fastify/multipart: đúng 1 tệp, không field khác. */
export const MULTIPART_LIMITS = { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 1 };
