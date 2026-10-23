/** Tên hàng đợi pg-boss (SAD §2.2.4). Handler đăng ký ở S1-02, S2-02, S6-06. */
export const QUEUES = [
  'email.transactional',
  'media.process',
  'media.purge-prefix',
  'maintenance.daily',
] as const;

export type QueueName = (typeof QUEUES)[number];
