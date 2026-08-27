-- Resolve the optional traveler UUID for the VERIFIED account claim without
-- opening any application-table RLS policy. This function is deliberately in
-- a non-exposed schema, accepts no caller-supplied id, and returns one UUID.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_client') THEN
    CREATE ROLE rls_client WITH LOGIN;
  END IF;
END
$$;

ALTER ROLE rls_client WITH
  LOGIN
  INHERIT
  NOCREATEDB
  NOCREATEROLE;

REVOKE anon FROM rls_client;
GRANT authenticated TO rls_client;
GRANT USAGE ON SCHEMA public TO rls_client;

CREATE SCHEMA IF NOT EXISTS "private";

REVOKE ALL ON SCHEMA "private" FROM PUBLIC;
REVOKE ALL ON SCHEMA "private" FROM anon, authenticated;
GRANT USAGE ON SCHEMA "private" TO rls_client;

CREATE FUNCTION "private"."current_traveler_profile_id"()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "id"
  FROM "public"."traveler_profiles"
  WHERE "account_id" = (
    NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'sub'
  )::uuid
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION "private"."current_traveler_profile_id"()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "private"."current_traveler_profile_id"()
TO rls_client;
