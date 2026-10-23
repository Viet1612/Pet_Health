#!/bin/sh
# Entrypoint của ph-app: một image, nhiều vai trò (AD-001).
set -eu

case "${1:-api}" in
  api) exec node dist/src/main-api.js ;;
  worker) exec node dist/src/main-worker.js ;;
  migrate) exec node dist/src/main-migrate.js ;;
  healthcheck-worker) exec node dist/src/healthcheck-worker.js ;;
  *)
    echo "Lệnh không hợp lệ: $1 (dùng: api | worker | migrate | healthcheck-worker)" >&2
    exit 64
    ;;
esac
