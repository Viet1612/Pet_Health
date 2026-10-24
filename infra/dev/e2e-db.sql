-- Database riêng cho E2E (S4-06), để test không đụng dữ liệu đang thử ở `pethealth`.
-- Chạy MỘT LẦN bằng superuser của PostgreSQL ServBay, sau init-db.sql và roles.sql:
--   psql -h 127.0.0.1 -p 5432 -U <superuser> -d postgres -f infra/dev/e2e-db.sql
-- Migration chạy tự động khi `pnpm e2e` khởi động (e2e/global-setup.ts).
SELECT 'CREATE DATABASE pethealth_e2e OWNER ph_owner ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pethealth_e2e')
\gexec

GRANT CONNECT ON DATABASE pethealth_e2e TO app_rw, app_worker;
