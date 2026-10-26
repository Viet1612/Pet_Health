#!/usr/bin/env bash
# Triển khai / cập nhật production (S7-01, S7-06) trên chính máy chủ:
#   bash infra/ops/deploy.sh            # kéo mã mới nhất của main rồi build + chạy
#   NO_PULL=1 bash infra/ops/deploy.sh  # build mã đang có, không git pull
# Các bước: git pull → build image → migrate (container `migrate`) → chạy api, worker, caddy,
# cloudflared → chờ api khỏe. Lỗi ở bước nào thì dừng, bản đang chạy giữ nguyên tới bước `up`.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE=(docker compose -f "$REPO_DIR/infra/compose.prod.yml")
SECRETS=/srv/pethealth/secrets

for f in postgres.env app.env cloudflared.env; do
  [[ -f $SECRETS/$f ]] || { echo "Thiếu $SECRETS/$f — chạy infra/ops/setup-secrets.sh trước" >&2; exit 1; }
done

cd "$REPO_DIR"
if [[ -z ${NO_PULL:-} ]]; then
  echo "== git pull"
  git fetch --quiet origin main
  git merge --ff-only origin/main
fi
echo "== Phiên bản: $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"

echo "== Build image (lần đầu khoảng 10–15 phút vì build libvips + HEIC)"
"${COMPOSE[@]}" build --pull

echo "== Chạy"
"${COMPOSE[@]}" up -d --remove-orphans

echo "== Chờ api khỏe"
for _ in $(seq 1 40); do
  state=$(docker inspect -f '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q api)" 2>/dev/null || echo starting)
  if [[ $state == healthy ]]; then
    echo "✔ api healthy"
    "${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}'
    exit 0
  fi
  sleep 3
done
echo "✖ api chưa khỏe sau 2 phút. Xem log: ${COMPOSE[*]} logs --tail 100 api migrate" >&2
"${COMPOSE[@]}" ps
exit 1
