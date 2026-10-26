#!/usr/bin/env bash
# Sao lưu CSDL production mỗi đêm (bù cho DEC-020): pg_dump nén vào /srv/pethealth/backups, giữ 14
# bản gần nhất. Cài cron (giờ máy chủ):
#   ( crontab -l 2>/dev/null; echo "30 2 * * * bash $PWD/infra/ops/backup-db.sh >> /var/log/pethealth-backup.log 2>&1" ) | crontab -
# Khôi phục: gunzip -c <tệp>.sql.gz | docker compose -f infra/compose.prod.yml exec -T postgres \
#   sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
set -euo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST=/srv/pethealth/backups
KEEP=14
mkdir -p "$DEST"

file="$DEST/pethealth-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose -f "$REPO_DIR/infra/compose.prod.yml" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip -9 >"$file"
echo "$(date -Is) ✔ $file ($(du -h "$file" | cut -f1))"

ls -1t "$DEST"/pethealth-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
