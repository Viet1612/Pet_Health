/** Đồng hồ tiêm được (SAD P7). Use case và repository chỉ lấy thời gian qua port này. */
export interface ClockPort {
  now(): Date;
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

/**
 * Đồng hồ giả cho test và E2E. Sau `set(instant)` đồng hồ chạy tiếp từ `instant` theo giờ thật
 * (giữ độ lệch); `frozen: true` thì đứng yên tại `instant` cho tới lần `set`/`advance` sau.
 */
export class FakeClock implements ClockPort {
  private offsetMs = 0;
  private frozenAt: number | null = null;

  constructor(private readonly realNow: () => number = Date.now) {}

  now(): Date {
    return new Date(this.frozenAt ?? this.realNow() + this.offsetMs);
  }

  set(instant: Date, opts: { frozen?: boolean } = {}): void {
    const target = instant.getTime();
    if (opts.frozen) {
      this.frozenAt = target;
      this.offsetMs = 0;
    } else {
      this.frozenAt = null;
      this.offsetMs = target - this.realNow();
    }
  }

  advance(ms: number): void {
    if (this.frozenAt === null) this.offsetMs += ms;
    else this.frozenAt += ms;
  }

  /** Về giờ thật. */
  reset(): void {
    this.offsetMs = 0;
    this.frozenAt = null;
  }
}
