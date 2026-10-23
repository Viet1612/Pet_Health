-- pnpm dev:reset — xóa sạch và tạo lại database dev (chạy bằng ph_owner, nối vào database postgres).
DROP DATABASE IF EXISTS pethealth WITH (FORCE);
CREATE DATABASE pethealth OWNER ph_owner ENCODING 'UTF8' TEMPLATE template0;
