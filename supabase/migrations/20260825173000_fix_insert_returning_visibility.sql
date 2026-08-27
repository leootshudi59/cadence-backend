-- Prisma creates rows with INSERT ... RETURNING. A SELECT policy that checks
-- ownership by re-querying the row through a helper cannot see that new row
-- early enough during RETURNING. Use the candidate row's ownership columns
-- directly for the two root tables; existing-row membership behavior stays
-- unchanged through the OR branches.

BEGIN;

ALTER POLICY traveler_profiles_select_controlled
ON public.traveler_profiles
USING (
  owner_id = private.current_account_id()
  OR account_id = private.current_account_id()
);

ALTER POLICY trips_select_visible
ON public.trips
USING (
  owner_id = private.current_account_id()
  OR private.can_view_trip(id)
);

COMMIT;
