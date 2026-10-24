import { ApiError, NetworkError, TimeoutError, type Problem } from '@ph/api-client';

import { m } from '../i18n';

export type UserMessage =
  | { kind: 'retryable'; message: string }
  | { kind: 'server'; message: string; ref?: string }
  | { kind: 'fields'; fields: Record<string, string> }
  | { kind: 'message'; message: string };

/** Câu của lỗi theo ngôn ngữ đang dùng; mã chưa có trong từ điển → `title` của server. */
export const problemText = (problem: Problem): string =>
  m.apiErrors.problem[problem.code] ?? problem.title;

/** Câu của một lỗi trường; chưa dịch được → `message` của server. */
export const fieldErrorText = (e: NonNullable<Problem['errors']>[number]): string =>
  m.apiErrors.field(e.code, e.field, e.params) ?? e.message;

/** Chuyển lỗi gọi API thành nội dung hiển thị thống nhất (FR-GEN-004, FR-GEN-011). */
export function toUserMessage(error: unknown): UserMessage {
  if (error instanceof TimeoutError || error instanceof NetworkError) {
    return { kind: 'retryable', message: m.toast.saveFailed };
  }
  if (error instanceof ApiError) {
    const { problem } = error;
    if (problem.status >= 500 || problem.code === 'UNEXPECTED_RESPONSE') {
      return {
        kind: 'server',
        message: problem.ref ? m.error.serverToastRef(problem.ref) : m.error.serverToast,
        ...(problem.ref ? { ref: problem.ref } : {}),
      };
    }
    if (problem.status === 422 && problem.errors?.length) {
      return {
        kind: 'fields',
        fields: Object.fromEntries(problem.errors.map((e) => [e.field, fieldErrorText(e)])),
      };
    }
    return { kind: 'message', message: problemText(problem) };
  }
  return { kind: 'server', message: m.error.serverToast };
}
