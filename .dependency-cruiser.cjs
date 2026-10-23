/**
 * Ranh giới phụ thuộc (SAD §2.2.2, UI Blueprint §3.3). Chạy: pnpm depcruise.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-adapters',
      comment:
        'domain/ là quy tắc nghiệp vụ thuần: không import application/adapters hay framework, DB.',
      severity: 'error',
      from: { path: '^apps/api/src/modules/[^/]+/domain/' },
      to: {
        path: ['/(application|adapters)/', '(^|/)(fastify|kysely|pg|pg-boss)(/|$)'],
      },
    },
    {
      name: 'domain-only-calendar',
      comment: 'domain/ chỉ được dùng platform/calendar trong platform/.',
      severity: 'error',
      from: { path: '^apps/api/src/modules/[^/]+/domain/' },
      to: { path: '^apps/api/src/platform/', pathNot: '^apps/api/src/platform/calendar/' },
    },
    {
      name: 'no-foreign-persistence',
      comment: 'Mô-đun không đọc bảng của mô-đun khác; dùng query port (SAD §2.2.2).',
      severity: 'error',
      from: { path: '^apps/api/src/modules/([^/]+)/' },
      to: {
        path: '^apps/api/src/modules/[^/]+/adapters/persistence/',
        pathNot: '^apps/api/src/modules/$1/',
      },
    },
    {
      name: 'web-not-api',
      comment: 'Web chỉ gọi backend qua @ph/api-client.',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/' },
    },
    {
      name: 'ui-pure',
      comment: 'ui/ không biết tới api/ hay features/.',
      severity: 'error',
      from: { path: '^apps/web/src/ui/' },
      to: { path: '^apps/web/src/(api|features)/' },
    },
    {
      name: 'feature-public-index',
      comment: 'Feature khác chỉ được import qua index của feature đó.',
      severity: 'error',
      from: { path: '^apps/web/src/features/([^/]+)/' },
      to: {
        path: '^apps/web/src/features/[^/]+/.+',
        pathNot: '^apps/web/src/features/($1/|[^/]+/index\\.tsx?$)',
      },
    },
    {
      name: 'api-client-standalone',
      comment: 'api-client chỉ chứa type + client, không phụ thuộc ứng dụng.',
      severity: 'error',
      from: { path: '^packages/api-client/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Chỉ loại thư mục build của dự án; "/dist/" trong node_modules phải giữ để bắt import framework.
    exclude: { path: '^(apps|packages)/[^/]+/(dist|coverage)/|routeTree\\.gen\\.ts$' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
};
