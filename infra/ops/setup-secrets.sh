#!/usr/bin/env bash
# Tạo bí mật production (S7-01) ở /srv/pethealth/secrets. Chạy MỘT LẦN, tự gõ tay trên máy chủ:
#   sudo bash infra/ops/setup-secrets.sh
# Mật khẩu DB và khóa ký được sinh ngẫu nhiên; mật khẩu Gmail, khóa R2, token tunnel do người chạy
# nhập (không hiện trên màn hình, không vào repo, không gửi đi đâu).
# Tệp đã có thì giữ nguyên (DB đã khởi tạo bằng mật khẩu cũ). Muốn đổi một giá trị: sửa tay tệp đó.
set -euo pipefail
umask 077

DIR=/srv/pethealth/secrets
APP_ORIGIN="${APP_ORIGIN:-https://pet.vietdeptrai.io.vn}"
SMTP_USER_DEFAULT="${SMTP_USER_DEFAULT:-viet16121997@gmail.com}"
R2_BUCKET_DEFAULT="${R2_BUCKET_DEFAULT:-pethealth-media}"

mkdir -p "$DIR"
chmod 700 "$DIR"

rand_hex() { openssl rand -hex "$1"; }
rand_b64() { openssl rand -base64 48 | tr -d '\n'; }

ask() { # ask <biến> <câu hỏi> [mặc định]
  local __var=$1 prompt=$2 def=${3:-} value
  if [[ -n $def ]]; then read -r -p "$prompt [$def]: " value; value=${value:-$def}
  else read -r -p "$prompt: " value; fi
  printf -v "$__var" '%s' "$value"
}
ask_secret() { # ask_secret <biến> <câu hỏi>
  local __var=$1 prompt=$2 value
  read -r -s -p "$prompt: " value; echo
  [[ -n $value ]] || { echo "Không được để trống" >&2; exit 1; }
  printf -v "$__var" '%s' "$value"
}

# ---- PostgreSQL ----
if [[ ! -f $DIR/postgres.env ]]; then
  cat >"$DIR/postgres.env" <<EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(rand_hex 24)
POSTGRES_DB=pethealth
APP_OWNER_PASSWORD=$(rand_hex 24)
APP_RW_PASSWORD=$(rand_hex 24)
APP_WORKER_PASSWORD=$(rand_hex 24)
EOF
  echo "✔ Đã tạo postgres.env"
else
  echo "• Giữ nguyên postgres.env"
fi
# shellcheck disable=SC1091
source "$DIR/postgres.env"

# ---- api + worker ----
if [[ ! -f $DIR/app.env ]]; then
  echo "== Gmail gửi email (xác minh tài khoản, quên mật khẩu)"
  ask SMTP_USER "Địa chỉ Gmail" "$SMTP_USER_DEFAULT"
  ask_secret SMTP_PASS "App Password của Gmail (16 ký tự, không hiện khi gõ)"
  echo "== Cloudflare R2 (lưu ảnh)"
  ask R2_ACCOUNT_ID "Account ID của Cloudflare"
  ask R2_BUCKET "Tên bucket" "$R2_BUCKET_DEFAULT"
  ask R2_ACCESS_KEY_ID "R2 Access Key ID"
  ask_secret R2_SECRET_ACCESS_KEY "R2 Secret Access Key (không hiện khi gõ)"
  cat >"$DIR/app.env" <<EOF
LOG_LEVEL=info
APP_ORIGIN=$APP_ORIGIN
DATABASE_URL=postgres://app_rw:$APP_RW_PASSWORD@postgres:5432/pethealth
WORKER_DATABASE_URL=postgres://app_worker:$APP_WORKER_PASSWORD@postgres:5432/pethealth
MIGRATION_DATABASE_URL=postgres://app_owner:$APP_OWNER_PASSWORD@postgres:5432/pethealth
DB_POOL_MAX=10
WORKER_DB_POOL_MAX=5
TRUST_CF_CONNECTING_IP=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=Pet Health <$SMTP_USER>
SMTP_DAILY_LIMIT=400
MEDIA_SIGNING_KEY=$(rand_b64)
ANALYTICS_HMAC_KEY=$(rand_b64)
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=$R2_ACCOUNT_ID
R2_BUCKET=$R2_BUCKET
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
EOF
  echo "✔ Đã tạo app.env"
else
  echo "• Giữ nguyên app.env"
fi

# ---- Cloudflare Tunnel ----
if [[ ! -f $DIR/cloudflared.env ]]; then
  echo "== Cloudflare Tunnel"
  ask_secret TUNNEL_TOKEN "Token của tunnel (chuỗi dài sau 'cloudflared service install', không hiện khi gõ)"
  printf 'TUNNEL_TOKEN=%s\n' "$TUNNEL_TOKEN" >"$DIR/cloudflared.env"
  echo "✔ Đã tạo cloudflared.env"
else
  echo "• Giữ nguyên cloudflared.env"
fi

chmod 600 "$DIR"/*.env
echo
echo "Xong. Các tệp bí mật (quyền 600):"
ls -l "$DIR"
echo "Hãy chép bản sao các tệp này vào trình quản lý mật khẩu của bạn."
