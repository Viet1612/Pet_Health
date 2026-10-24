// Sự kiện vòng đời mốc, phát đồng bộ trong transaction của command (SAD §2.2.2). `notifications`
// nghe để resolve thông báo và đánh dấu cần đồng bộ lại; `scheduling` không biết ai nghe.

interface Base {
  milestoneId: string;
  ownerId: string;
  /** Thời điểm command (ClockPort). */
  at: Date;
}

export type MilestoneEvent =
  | (Base & { type: 'MilestoneCreated' })
  | (Base & { type: 'MilestoneEdited' })
  | (Base & { type: 'MilestoneRescheduled' })
  | (Base & { type: 'MilestoneCancelled' })
  | (Base & { type: 'MilestoneCompleted' })
  | (Base & { type: 'MilestoneUndone'; completedAt: Date });
