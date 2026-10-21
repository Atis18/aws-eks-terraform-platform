-- Run as dbadmin, connected to appdb.
-- Run AFTER the equipments and employees migrations.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'appuser'
    ) THEN
        CREATE ROLE appuser LOGIN;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE appdb TO appuser;

GRANT USAGE ON SCHEMA public TO appuser;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.equipments, public.employees
TO appuser;

-- Permissions for future tables created by dbadmin.
ALTER DEFAULT PRIVILEGES FOR ROLE dbadmin
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO appuser;