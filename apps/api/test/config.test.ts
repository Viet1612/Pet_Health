import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.js';

const valid = {
  APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgres://a:b@localhost:5432/x',
  WORKER_DATABASE_URL: 'postgres://a:b@localhost:5432/x',
  MIGRATION_DATABASE_URL: 'postgres://a:b@localhost:5432/x',
};

describe('loadConfig', () => {
  it('áp giá trị mặc định', () => {
    const config = loadConfig(valid);
    expect(config).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      DB_POOL_MAX: 10,
      WORKER_DB_POOL_MAX: 5,
      HEARTBEAT_FILE: '/tmp/alive',
    });
  });

  it('ép kiểu số từ chuỗi', () => {
    expect(loadConfig({ ...valid, PORT: '8080', DB_POOL_MAX: '3' })).toMatchObject({
      PORT: 8080,
      DB_POOL_MAX: 3,
    });
  });

  it('thiếu DATABASE_URL thì báo đúng tên biến', () => {
    const env: Record<string, string> = { ...valid };
    delete env.DATABASE_URL;
    expect(() => loadConfig(env)).toThrow(ConfigError);
    try {
      loadConfig(env);
    } catch (error) {
      expect((error as ConfigError).issues.join('\n')).toContain('DATABASE_URL');
    }
  });

  it('sai kiểu thì báo lỗi', () => {
    expect(() => loadConfig({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ ...valid, APP_ORIGIN: 'not-a-url' })).toThrow(/APP_ORIGIN/);
    expect(() => loadConfig({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
