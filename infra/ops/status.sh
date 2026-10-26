#!/usr/bin/env bash
# Kiểm tra nhanh production (S7-01): container, dung lượng, job lỗi 24 giờ.
# Thoát mã 1 nếu có container không chạy hoặc không khỏe.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE=(docker compose -f "$REPO_DIR/infra/compose.prod.yml")
bad=0

echo "== Container"
"${COMPOSE[@]}" ps -a --format 'table {{.Service}}\t{{.State}}\t{{.Health}}\t{{.Status}}'
while read -r svc state health; do
  [[ $svc == migrate ]] && continue
  if [[ $state != running || ( -n $health && $health != healthy ) ]]; then
    echo "!! $svc: $state $health"
    bad=1
  fi
done < <("${COMPOSE[@]}" ps -a --format '{{.Service}} {{.State}} {{.Health}}')

echo "== Dung lượng"
docker system df --format 'table {{.Type}}\t{{.Size}}\t{{.Reclaimable}}'
df -h / | tail -1
use=$(df --output=pcent / | tail -1 | tr -dc '0-9')
(( use > 80 )) && { echo "!! Ổ đĩa dùng ${use}%"; bad=1; }

echo "== Job lỗi trong 24 giờ"
"${COMPOSE[@]}" exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT name, count(*) FROM pgboss.job WHERE state = '"'"'failed'"'"' AND completed_on > now() - interval '"'"'24 hours'"'"' GROUP BY name"' \
  || echo "(không đọc được pgboss)"

echo "== Truy cập công khai"
origin=$(grep -E '^APP_ORIGIN=' /srv/pethealth/secrets/app.env 2>/dev/null | cut -d= -f2-)
if [[ -n $origin ]]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "$origin/api/v1/healthz" || echo 000)
  echo "$origin/api/v1/healthz → $code"
  [[ $code == 200 ]] || bad=1
fi

exit $bad
