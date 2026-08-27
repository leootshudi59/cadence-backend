-- Dedicated login role for cadence-api's request-path Prisma connection.
--
-- Supabase's default Postgres role is `postgres`, a superuser that BYPASSES
-- every Row Level Security policy. If the app ever connects as `postgres`,
-- RLS enforcement silently does nothing. `rls_client` is the role the app
-- must use instead. DATABASE_URL / DIRECT_URL remain privileged for Prisma
-- migrations and seed only; runtime derives the same pooler URL with the
-- `rls_client.<project-ref>` username and RLS_CLIENT_PASSWORD. The API only
-- accepts authenticated-user JWTs, so this role inherits `authenticated`
-- privileges and never `anon` privileges.
--
-- No password is set here — a committed migration must never contain a
-- credential, even a placeholder. Set it out of band once a real database
-- exists, from an env var:
--   ALTER ROLE rls_client WITH PASSWORD '<value of RLS_CLIENT_PASSWORD>';
-- (via the Supabase dashboard's SQL editor, or psql using DIRECT_URL) before
-- this role is ever used to connect.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'rls_client') then
    create role rls_client with login;
  end if;
end
$$;

alter role rls_client with
  login
  inherit
  nocreatedb
  nocreaterole;

revoke anon from rls_client;
grant authenticated to rls_client;

grant usage on schema public to rls_client;
