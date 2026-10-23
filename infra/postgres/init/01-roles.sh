#!/bin/sh
# Tạo role ứng dụng khi container PostgreSQL khởi tạo lần đầu (S1-01). Mount vào
# /docker-entrypoint-initdb.d/ (staging, production, Testcontainers). Mật khẩu lấy từ biến môi trường.
#   app_owner  — sở hữu bảng, chạy migration (MIGRATION_DATABASE_URL)
#   app_rw     — tiến trình api, bị RLS chặn (DATABASE_URL)
#   app_worker — tiến trình worker, BYPASSRLS cho job xuyên tài khoản (WORKER_DATABASE_URL)
set -eu

: "${APP_OWNER_PASSWORD:?thiếu APP_OWNER_PASSWORD}"
: "${APP_RW_PASSWORD:?thiếu APP_RW_PASSWORD}"
: "${APP_WORKER_PASSWORD:?thiếu APP_WORKER_PASSWORD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v owner_pw="$APP_OWNER_PASSWORD" -v rw_pw="$APP_RW_PASSWORD" -v worker_pw="$APP_WORKER_PASSWORD" <<'SQL'
CREATE ROLE app_owner  LOGIN PASSWORD :'owner_pw';
CREATE ROLE app_rw     LOGIN NOBYPASSRLS PASSWORD :'rw_pw';
CREATE ROLE app_worker LOGIN BYPASSRLS   PASSWORD :'worker_pw';
CREATE EXTENSION IF NOT EXISTS citext;
GRANT CREATE, USAGE ON SCHEMA public TO app_owner;
SELECT format('ALTER DATABASE %I OWNER TO app_owner', current_database()) \gexec
SQL
