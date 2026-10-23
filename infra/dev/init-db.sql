-- Chạy MỘT LẦN bằng superuser của PostgreSQL ServBay (S0-02):
--   psql -h 127.0.0.1 -p 5432 -U <superuser> -d postgres -f infra/dev/init-db.sql
-- Tạo role chủ sở hữu và database dev của Pet Health. Giá trị chỉ dùng cho máy dev.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ph_owner') THEN
    CREATE ROLE ph_owner LOGIN PASSWORD 'ph_owner_dev' CREATEDB CREATEROLE;
  END IF;
END
$$;

SELECT 'CREATE DATABASE pethealth OWNER ph_owner ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pethealth')
\gexec
