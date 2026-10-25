import type { FastifyInstance } from 'fastify';

import { createAnalyticsPort, registerAnalyticsRoutes } from './analytics/index.js';
import { registerDashboardRoutes, type DashboardDeps } from './dashboard/index.js';
import {
  registerHealthRecordsRoutes,
  visitPhotoPresenter,
  visitPhotoResolver,
  type HealthRecordsDeps,
} from './health-records/index.js';
import { registerIdentityRoutes, type IdentityDeps } from './identity/index.js';
import {
  registerMediaApiRoutes,
  registerMediaFileRoutes,
  type MediaDeps,
  type TargetResolvers,
} from './media/index.js';
import {
  notificationQuery,
  onMilestoneEvent,
  registerNotificationsRoutes,
  type NotificationsDeps,
} from './notifications/index.js';
import { petAvatarTargetResolver, registerPetsRoutes, type PetsDeps } from './pets/index.js';
import { registerRoutinesRoutes, type RoutinesDeps } from './routines/index.js';
import {
  registerSchedulingRoutes,
  type MilestoneEvent,
  type SchedulingDeps,
} from './scheduling/index.js';
import {
  registerSocialRoutes,
  socialAvatarTargetResolver,
  socialPostPhotoTargetResolver,
} from './social/index.js';
import { SyncEventBus } from '../platform/events/sync-event-bus.js';
import type { ClockPort } from '../platform/clock/clock.js';

export interface ModuleDeps {
  identity: IdentityDeps;
  pets: PetsDeps;
  media: MediaDeps;
  healthRecords: HealthRecordsDeps;
  scheduling: SchedulingDeps;
  notifications: NotificationsDeps;
  routines: RoutinesDeps;
  dashboard: DashboardDeps;
}

/** Đăng ký route của mọi mô-đun nghiệp vụ. Dùng chung cho main-api và sinh OpenAPI. */
export async function registerModules(api: FastifyInstance, deps: ModuleDeps): Promise<void> {
  // Analytics (S6-05) dùng chung db, rate limiter, khóa HMAC của identity.
  const analytics = createAnalyticsPort({
    clock: deps.identity.clock,
    hmacKey: deps.identity.analyticsHmacKey,
  });
  await registerAnalyticsRoutes(api, {
    db: deps.identity.db,
    clock: deps.identity.clock,
    rateLimiter: deps.identity.rateLimiter,
    hmacKey: deps.identity.analyticsHmacKey,
    trustCfConnectingIp: deps.identity.trustCfConnectingIp,
  });
  await registerIdentityRoutes(api, { ...deps.identity, analytics });
  await registerPetsRoutes(api, deps.pets, deps.media);
  await registerMediaApiRoutes(api, { VISIT_PHOTO: visitPhotoPresenter(deps.media) });
  await registerHealthRecordsRoutes(api, deps.healthRecords, deps.media);

  // Sự kiện mốc → notifications, cùng transaction (scheduling không import notifications).
  const milestoneEvents = new SyncEventBus<MilestoneEvent>();
  milestoneEvents.subscribe(onMilestoneEvent);
  await registerSchedulingRoutes(api, deps.scheduling, {
    events: milestoneEvents,
    notifications: notificationQuery,
    analytics,
  });
  await registerNotificationsRoutes(api, { ...deps.notifications, analytics });
  await registerRoutinesRoutes(api, deps.routines);
  await registerDashboardRoutes(api, { ...deps.dashboard, analytics }, deps.media);
  await registerSocialRoutes(
    api,
    { clock: deps.identity.clock, rateLimiter: deps.identity.rateLimiter },
    deps.media,
  );
}

/** Nơi lưu và gắn ảnh theo loại mục tiêu; mô-đun sở hữu mục tiêu thêm vào (AVATAR ở S2-03). */
export function mediaTargetResolvers(clock: ClockPort): TargetResolvers {
  return {
    AVATAR: petAvatarTargetResolver(clock),
    VISIT_PHOTO: visitPhotoResolver(),
    USER_AVATAR: socialAvatarTargetResolver(clock),
    POST_PHOTO: socialPostPhotoTargetResolver(clock),
  };
}

/** Route ở gốc (ngoài `/api/v1`) của các mô-đun. */
export async function registerRootModuleRoutes(
  app: FastifyInstance,
  deps: ModuleDeps,
): Promise<void> {
  await registerMediaFileRoutes(app, deps.media);
}
