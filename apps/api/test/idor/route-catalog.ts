import type { RouteOptions } from 'fastify';

import { API_PREFIX } from '../../src/platform/http/openapi.js';

export interface CatalogRoute {
  method: string;
  /** Đường dẫn bỏ tiền tố `/api/v1`, dạng Fastify: `/pets/:petId/weights`. */
  url: string;
  public: boolean;
  params: string[];
}

/** Ghi lại mọi route qua `AppDeps.onRoute` (đăng ký trước mọi plugin). Bỏ HEAD, OPTIONS. */
export function createRouteCatalog(): {
  onRoute: (route: RouteOptions) => void;
  routes: CatalogRoute[];
} {
  const routes: CatalogRoute[] = [];
  const onRoute = (route: RouteOptions): void => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const url = route.url.startsWith(API_PREFIX) ? route.url.slice(API_PREFIX.length) : route.url;
    for (const method of methods) {
      if (method === 'HEAD' || method === 'OPTIONS') continue;
      routes.push({
        method,
        url,
        public: route.config?.public === true,
        params: pathParams(url),
      });
    }
  };
  return { onRoute, routes };
}

export function pathParams(url: string): string[] {
  return [...url.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1] ?? '');
}

/** Thay `:param` bằng giá trị trong `ids` và thêm tiền tố API. */
export function fillPath(url: string, ids: Record<string, string>): string {
  return (
    API_PREFIX +
    url.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name: string) => {
      const value = ids[name];
      if (value === undefined) throw new Error(`Thiếu giá trị cho :${name} (${url})`);
      return encodeURIComponent(value);
    })
  );
}
