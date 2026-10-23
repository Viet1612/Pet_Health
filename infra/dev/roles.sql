-- Chạy MỘT LẦN bằng superuser của PostgreSQL ServBay, sau init-db.sql (S1-01):
--   psql -h 127.0.0.1 -p 5432 -U <superuser> -d pethealth -f infra/dev/roles.sql
-- Tạo role ứng dụng cho máy dev. ph_owner đóng vai app_owner (sở hữu bảng, chạy migration).
-- Tạo role BYPASSRLS cần superuser nên không làm được trong migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN NOBYPASSRLS PASSWORD 'app_rw_dev';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_worker') THEN
    CREATE ROLE app_worker LOGIN BYPASSRLS PASSWORD 'app_worker_dev';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE pethealth TO app_rw, app_worker;
