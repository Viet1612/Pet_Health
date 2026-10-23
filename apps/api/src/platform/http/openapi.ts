import swagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export const API_PREFIX = '/api/v1';

/** OpenAPI 3.1 sinh từ schema Zod của route (SAD P2). Đường dẫn tương đối với `/api/v1`. */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: { title: 'Pet Health API', version: '1.0.0' },
      servers: [{ url: API_PREFIX }],
    },
    stripBasePath: true,
    transform: jsonSchemaTransform,
  });
}
