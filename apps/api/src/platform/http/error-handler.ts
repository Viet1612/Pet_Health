import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { AppError, NotFoundError, type FieldError } from '../errors/app-error.js';
import { DEFAULT_FIELD_MESSAGES, fieldErrorCode, type IssueLike } from './zod-messages.vi.js';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json; charset=utf-8';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  code: string;
  ref: string;
  errors?: FieldError[];
  retryAfter?: number;
}

const kebab = (code: string): string => code.toLowerCase().replaceAll('_', '-');

/** Lỗi của framework (body, content-type) → AppError. */
function fromFrameworkError(error: FastifyError): AppError | null {
  switch (error.code) {
    case 'FST_ERR_CTP_BODY_TOO_LARGE':
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn');
    case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
      return new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Định dạng dữ liệu không được hỗ trợ');
    case 'FST_ERR_CTP_EMPTY_JSON_BODY':
    case 'FST_ERR_CTP_INVALID_JSON_BODY':
      return new AppError(400, 'MALFORMED_JSON', 'Dữ liệu JSON không hợp lệ');
  }
  // secure-json-parse ném SyntaxError khi JSON hỏng.
  if (error.statusCode === 400 && error instanceof SyntaxError) {
    return new AppError(400, 'MALFORMED_JSON', 'Dữ liệu JSON không hợp lệ');
  }
  return null;
}

function fromValidation(error: FastifyError): AppError | null {
  if (!hasZodFastifySchemaValidationErrors(error)) return null;
  const errors = error.validation.map((v): FieldError => {
    const issue = { code: v.keyword, ...v.params } as IssueLike;
    const code = fieldErrorCode(issue);
    return {
      field: v.instancePath.replace(/^\//, '').replaceAll('/', '.'),
      code,
      message: v.message ?? DEFAULT_FIELD_MESSAGES[code],
    };
  });
  return new AppError(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { errors });
}

function send(
  appOrigin: string,
  request: FastifyRequest,
  reply: FastifyReply,
  error: AppError,
): FastifyReply {
  const body: ProblemBody = {
    type: `${appOrigin}/errors/${kebab(error.code)}`,
    title: error.title,
    status: error.status,
    code: error.code,
    ref: request.id,
  };
  if (error.options.errors) body.errors = error.options.errors;
  if (error.options.retryAfter !== undefined) {
    body.retryAfter = error.options.retryAfter;
    void reply.header('retry-after', String(error.options.retryAfter));
  }
  for (const [name, value] of Object.entries(error.options.headers ?? {})) {
    void reply.header(name, value);
  }
  return reply.code(error.status).type(PROBLEM_CONTENT_TYPE).send(JSON.stringify(body));
}

/** Mọi lỗi trả `application/problem+json` (SAD §2.4.3, FR-GEN-011). */
export function registerErrorHandling(app: FastifyInstance, appOrigin: string): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const known =
      error instanceof AppError ? error : (fromValidation(error) ?? fromFrameworkError(error));
    if (known) {
      if (known.status >= 500) request.log.error({ err: error }, 'request failed');
      return send(appOrigin, request, reply, known);
    }
    // Lỗi không lường trước: log đủ stack, phản hồi không lộ chi tiết.
    request.log.error({ err: error }, 'unhandled error');
    return send(
      appOrigin,
      request,
      reply,
      new AppError(500, 'INTERNAL_ERROR', 'Có lỗi xảy ra, vui lòng thử lại sau.'),
    );
  });

  app.setNotFoundHandler((request, reply) => send(appOrigin, request, reply, new NotFoundError()));
}
