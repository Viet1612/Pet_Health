import type { Transaction } from 'kysely';

import type { Database } from '../db/kysely.js';

/**
 * Bus sự kiện đồng bộ (SAD §2.2.2): `publish` gọi lần lượt các handler trong **cùng transaction**
 * của command, nên handler lỗi thì cả command rollback. Mô-đun phát không biết mô-đun nghe;
 * composition root đăng ký handler.
 */
export interface EventPublisher<E> {
  publish(trx: Transaction<Database>, event: E): Promise<void>;
}

export type EventHandler<E> = (trx: Transaction<Database>, event: E) => Promise<void>;

export class SyncEventBus<E> implements EventPublisher<E> {
  private readonly handlers: EventHandler<E>[] = [];

  subscribe(handler: EventHandler<E>): void {
    this.handlers.push(handler);
  }

  async publish(trx: Transaction<Database>, event: E): Promise<void> {
    for (const handler of this.handlers) await handler(trx, event);
  }
}
