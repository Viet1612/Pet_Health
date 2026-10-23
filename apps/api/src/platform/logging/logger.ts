import { pino, type DestinationStream, type Logger, type LoggerOptions } from 'pino';

/**
 * Đường dẫn bị che trong log (SAD §4.1.7, NFR-SEC-009). Wildcard `*.x` của pino chỉ khớp một cấp,
 * nên quy tắc "không log body request" vẫn bắt buộc; `redact` chỉ là lớp phòng hờ.
 */
export const REDACT_PATHS = [
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'email',
  'symptoms',
  'diagnosis',
  'prescription',
  'note',
  'description',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.token',
  '*.symptoms',
  '*.diagnosis',
  '*.prescription',
  '*.note',
  '*.description',
  '*.email',
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
];

export interface LoggerConfig {
  level: string;
  /** Định dạng dễ đọc cho dev (pino-pretty); production luôn là JSON. */
  pretty?: boolean;
}

export function loggerOptions(config: LoggerConfig): LoggerOptions {
  return {
    level: config.level,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    ...(config.pretty
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } }
      : {}),
  };
}

export function createLogger(config: LoggerConfig, destination?: DestinationStream): Logger {
  return destination ? pino(loggerOptions(config), destination) : pino(loggerOptions(config));
}
