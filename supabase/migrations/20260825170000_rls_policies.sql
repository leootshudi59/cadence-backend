-- Cadence application RLS policies.
--
-- Membership checks run through tightly-scoped SECURITY DEFINER helpers.
-- Querying trip_participants directly from both trips and trip_participants
-- policies would recurse through RLS (and can return nothing or fail). These
-- helpers bypass that recursion, expose only booleans/foreign keys, pin an
-- empty search_path, and remain executable only by the runtime role.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO rls_client;

CREATE OR REPLACE FUNCTION private.current_account_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  subject text;
BEGIN
  claims := NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb;
  subject := claims ->> 'sub';

  IF subject IS NULL OR subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN subject::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION private.current_traveler_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT traveler.id
  FROM public.traveler_profiles AS traveler
  WHERE traveler.account_id = private.current_account_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.controls_traveler(target_traveler_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.traveler_profiles AS traveler
    WHERE traveler.id = target_traveler_id
      AND (
        traveler.owner_id = private.current_account_id()
        OR traveler.account_id = private.current_account_id()
      )
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_trip(target_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = target_trip_id
      AND trip.owner_id = private.current_account_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.can_view_trip(target_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.owns_trip(target_trip_id)
    OR EXISTS (
      SELECT 1
      FROM public.trip_participants AS participant
      JOIN public.traveler_profiles AS traveler
        ON traveler.id = participant.traveler_id
      WHERE participant.trip_id = target_trip_id
        AND participant.invite_status = 'ACCEPTED'
        AND (
          traveler.owner_id = private.current_account_id()
          OR traveler.account_id = private.current_account_id()
        )
    )
$$;

CREATE OR REPLACE FUNCTION private.can_edit_trip(target_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.owns_trip(target_trip_id)
    OR EXISTS (
      SELECT 1
      FROM public.trip_participants AS participant
      JOIN public.traveler_profiles AS traveler
        ON traveler.id = participant.traveler_id
      WHERE participant.trip_id = target_trip_id
        AND participant.invite_status = 'ACCEPTED'
        AND participant.role IN ('OWNER', 'EDITOR')
        AND (
          traveler.owner_id = private.current_account_id()
          OR traveler.account_id = private.current_account_id()
        )
    )
$$;

CREATE OR REPLACE FUNCTION private.traveler_is_on_trip(
  target_trip_id uuid,
  target_traveler_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = target_trip_id
      AND participant.traveler_id = target_traveler_id
  )
$$;

CREATE OR REPLACE FUNCTION private.can_view_traveler_documents(
  target_traveler_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.controls_traveler(target_traveler_id)
    OR EXISTS (
      SELECT 1
      FROM public.trip_participants AS viewer_participant
      JOIN public.traveler_profiles AS viewer
        ON viewer.id = viewer_participant.traveler_id
      JOIN public.trip_participants AS document_owner_participant
        ON document_owner_participant.trip_id = viewer_participant.trip_id
      WHERE document_owner_participant.traveler_id = target_traveler_id
        AND document_owner_participant.invite_status = 'ACCEPTED'
        AND viewer_participant.invite_status = 'ACCEPTED'
        AND viewer_participant.can_view_documents
        AND (
          viewer.owner_id = private.current_account_id()
          OR viewer.account_id = private.current_account_id()
        )
    )
$$;

CREATE OR REPLACE FUNCTION private.booking_trip_id(target_booking_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT booking.trip_id
  FROM public.bookings AS booking
  WHERE booking.id = target_booking_id
$$;

CREATE OR REPLACE FUNCTION private.expense_trip_id(target_expense_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT expense.trip_id
  FROM public.expenses AS expense
  WHERE expense.id = target_expense_id
$$;

CREATE OR REPLACE FUNCTION private.can_attach_ingestion(
  target_ingestion_id uuid,
  target_trip_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT target_ingestion_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.raw_ingestions AS ingestion
      WHERE ingestion.id = target_ingestion_id
        AND ingestion.owner_id = private.current_account_id()
        AND (ingestion.trip_id IS NULL OR ingestion.trip_id = target_trip_id)
    )
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO rls_client;

-- Start from no user-facing writes. Grants below are deliberately narrower
-- than the policies: reference data stays read-only, raw input stays kept,
-- and immutable ownership/foreign-key columns cannot be reassigned by UPDATE.
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM rls_client;

GRANT INSERT ON TABLE
  public.profiles,
  public.traveler_profiles,
  public.traveler_health,
  public.traveler_dietary,
  public.traveler_medications,
  public.family_links,
  public.travel_documents,
  public.trips,
  public.trip_participants,
  public.bookings,
  public.booking_travelers,
  public.expenses,
  public.expense_shares,
  public.raw_ingestions
TO rls_client;

GRANT DELETE ON TABLE
  public.traveler_profiles,
  public.traveler_health,
  public.traveler_dietary,
  public.traveler_medications,
  public.family_links,
  public.travel_documents,
  public.trips,
  public.trip_participants,
  public.bookings,
  public.booking_travelers,
  public.expenses,
  public.expense_shares
TO rls_client;

GRANT UPDATE (
  email, display_name, avatar_url, locale, home_iana_zone,
  base_currency, ingestion_alias, updated_at
) ON public.profiles TO rls_client;

GRANT UPDATE (
  first_name, last_name, birth_date, nationality, residence_country,
  earliest_wake_time, latest_end_time, max_activities_per_day,
  break_minutes_per_day, nap_required, nap_window_start, nap_window_end,
  prefers_local_over_touristic, notes, updated_at
) ON public.traveler_profiles TO rls_client;

GRANT UPDATE (
  wheelchair_user, max_walk_km_per_day, stairs_ok, needs_elevator,
  mobility_notes, conditions, updated_at
) ON public.traveler_health TO rls_client;

GRANT UPDATE (kind, label, severity, notes, updated_at)
ON public.traveler_dietary TO rls_client;

GRANT UPDATE (
  label, doses_per_day, units_on_hand, requires_refrigeration,
  requires_prescription_abroad, notes, updated_at
) ON public.traveler_medications TO rls_client;

GRANT UPDATE (relation) ON public.family_links TO rls_client;

GRANT UPDATE (
  type, label, issuing_country, number_ciphertext, number_iv, number_salt,
  issued_on, expires_on, storage_path, storage_iv, storage_salt,
  covers_countries, updated_at
) ON public.travel_documents TO rls_client;

GRANT UPDATE (
  title, destination_city, destination_country, place_id, iana_zone,
  start_date, end_date, status, budget_amount, budget_currency,
  base_currency, cover_image_url, updated_at
) ON public.trips TO rls_client;

GRANT UPDATE (role, invite_status, can_view_documents, responded_at)
ON public.trip_participants TO rls_client;

GRANT UPDATE (
  type, title, provider_name, confirmation_number, status, start_at,
  start_iana_zone, start_place_id, end_at, end_iana_zone, end_place_id,
  details, verification_status, extraction_confidence, raw_ingestion_id,
  updated_at
) ON public.bookings TO rls_client;

GRANT UPDATE (seat, ticket_number)
ON public.booking_travelers TO rls_client;

GRANT UPDATE (
  category, label, amount, currency, fx_rate, amount_base, base_currency,
  spent_at, iana_zone, split_mode, settled, receipt_storage_path, updated_at
) ON public.expenses TO rls_client;

GRANT UPDATE (share_weight, amount_owed, amount_owed_base, settled_at)
ON public.expense_shares TO rls_client;

GRANT UPDATE (
  trip_id, source, sender_address, received_at, content_type,
  raw_storage_path, raw_text, status, model_id, prompt_version,
  extracted_json, confidence, attempts, error, processed_at
) ON public.raw_ingestions TO rls_client;

-- profiles: an authenticated account can only create/read/update itself.
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = private.current_account_id());

CREATE POLICY profiles_insert_own ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = private.current_account_id());

CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE TO authenticated
USING (id = private.current_account_id())
WITH CHECK (id = private.current_account_id());

-- Non-sensitive traveler profiles are controlled by their creator or by the
-- optional account linked to that traveler. Trip membership adds no access.
CREATE POLICY traveler_profiles_select_controlled ON public.traveler_profiles
FOR SELECT TO authenticated
USING (private.controls_traveler(id));

CREATE POLICY traveler_profiles_insert_controlled ON public.traveler_profiles
FOR INSERT TO authenticated
WITH CHECK (
  owner_id = private.current_account_id()
  AND (account_id IS NULL OR account_id = private.current_account_id())
);

CREATE POLICY traveler_profiles_update_controlled ON public.traveler_profiles
FOR UPDATE TO authenticated
USING (private.controls_traveler(id))
WITH CHECK (private.controls_traveler(id));

CREATE POLICY traveler_profiles_delete_controlled ON public.traveler_profiles
FOR DELETE TO authenticated
USING (private.controls_traveler(id));

-- Health, dietary constraints, and medication are the strictest tier. Only
-- the traveler account or its managing owner can access them; co-travelers
-- never gain access through trip membership.
CREATE POLICY traveler_health_select_controlled ON public.traveler_health
FOR SELECT TO authenticated
USING (private.controls_traveler(traveler_id));

CREATE POLICY traveler_health_insert_controlled ON public.traveler_health
FOR INSERT TO authenticated
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY traveler_health_update_controlled ON public.traveler_health
FOR UPDATE TO authenticated
USING (private.controls_traveler(traveler_id))
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY traveler_health_delete_controlled ON public.traveler_health
FOR DELETE TO authenticated
USING (private.controls_traveler(traveler_id));

CREATE POLICY traveler_dietary_select_controlled ON public.traveler_dietary
FOR SELECT TO authenticated
USING (private.controls_traveler(traveler_id));

CREATE POLICY traveler_dietary_insert_controlled ON public.traveler_dietary
FOR INSERT TO authenticated
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY traveler_dietary_update_controlled ON public.traveler_dietary
FOR UPDATE TO authenticated
USING (private.controls_traveler(traveler_id))
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY traveler_dietary_delete_controlled ON public.traveler_dietary
FOR DELETE TO authenticated
USING (private.controls_traveler(traveler_id));

CREATE POLICY traveler_medications_select_controlled ON public.traveler_medications
FOR SELECT TO authenticated
USING (private.controls_traveler(traveler_id));

CREATE POLICY traveler_medications_insert_controlled ON public.traveler_medications
FOR INSERT TO authenticated
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY traveler_medications_update_controlled ON public.traveler_medications
FOR UPDATE TO authenticated
USING (private.controls_traveler(traveler_id))
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY traveler_medications_delete_controlled ON public.traveler_medications
FOR DELETE TO authenticated
USING (private.controls_traveler(traveler_id));

-- A relation can be read when either endpoint is controlled, but creating,
-- changing, or deleting it requires control of both endpoints.
CREATE POLICY family_links_select_related ON public.family_links
FOR SELECT TO authenticated
USING (
  private.controls_traveler(from_traveler_id)
  OR private.controls_traveler(to_traveler_id)
);

CREATE POLICY family_links_insert_controlled ON public.family_links
FOR INSERT TO authenticated
WITH CHECK (
  private.controls_traveler(from_traveler_id)
  AND private.controls_traveler(to_traveler_id)
);

CREATE POLICY family_links_update_controlled ON public.family_links
FOR UPDATE TO authenticated
USING (
  private.controls_traveler(from_traveler_id)
  AND private.controls_traveler(to_traveler_id)
)
WITH CHECK (
  private.controls_traveler(from_traveler_id)
  AND private.controls_traveler(to_traveler_id)
);

CREATE POLICY family_links_delete_controlled ON public.family_links
FOR DELETE TO authenticated
USING (
  private.controls_traveler(from_traveler_id)
  AND private.controls_traveler(to_traveler_id)
);

-- Document visibility is deliberately independent from trip visibility.
-- Shared access requires an accepted common trip AND the viewer's explicit
-- can_view_documents flag. Shared viewers never receive document write access.
CREATE POLICY travel_documents_select_permitted ON public.travel_documents
FOR SELECT TO authenticated
USING (private.can_view_traveler_documents(traveler_id));

CREATE POLICY travel_documents_insert_controlled ON public.travel_documents
FOR INSERT TO authenticated
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY travel_documents_update_controlled ON public.travel_documents
FOR UPDATE TO authenticated
USING (private.controls_traveler(traveler_id))
WITH CHECK (private.controls_traveler(traveler_id));

CREATE POLICY travel_documents_delete_controlled ON public.travel_documents
FOR DELETE TO authenticated
USING (private.controls_traveler(traveler_id));

-- Trips and their children use accepted membership. OWNER/EDITOR can mutate
-- plan data; only the account owner can delete a trip or manage participants.
CREATE POLICY trips_select_visible ON public.trips
FOR SELECT TO authenticated
USING (private.can_view_trip(id));

CREATE POLICY trips_insert_owned ON public.trips
FOR INSERT TO authenticated
WITH CHECK (owner_id = private.current_account_id());

CREATE POLICY trips_update_editable ON public.trips
FOR UPDATE TO authenticated
USING (private.can_edit_trip(id))
WITH CHECK (private.can_edit_trip(id));

CREATE POLICY trips_delete_owned ON public.trips
FOR DELETE TO authenticated
USING (private.owns_trip(id));

CREATE POLICY trip_participants_select_visible ON public.trip_participants
FOR SELECT TO authenticated
USING (
  private.can_view_trip(trip_id)
  OR private.controls_traveler(traveler_id)
);

CREATE POLICY trip_participants_insert_owned_trip ON public.trip_participants
FOR INSERT TO authenticated
WITH CHECK (private.owns_trip(trip_id));

CREATE POLICY trip_participants_update_owned_trip ON public.trip_participants
FOR UPDATE TO authenticated
USING (private.owns_trip(trip_id))
WITH CHECK (private.owns_trip(trip_id));

CREATE POLICY trip_participants_delete_owned_trip ON public.trip_participants
FOR DELETE TO authenticated
USING (private.owns_trip(trip_id));

CREATE POLICY bookings_select_visible_trip ON public.bookings
FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY bookings_insert_editable_trip ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  private.can_edit_trip(trip_id)
  AND private.can_attach_ingestion(raw_ingestion_id, trip_id)
);

CREATE POLICY bookings_update_editable_trip ON public.bookings
FOR UPDATE TO authenticated
USING (private.can_edit_trip(trip_id))
WITH CHECK (
  private.can_edit_trip(trip_id)
  AND private.can_attach_ingestion(raw_ingestion_id, trip_id)
);

CREATE POLICY bookings_delete_editable_trip ON public.bookings
FOR DELETE TO authenticated
USING (private.can_edit_trip(trip_id));

CREATE POLICY booking_travelers_select_visible_trip ON public.booking_travelers
FOR SELECT TO authenticated
USING (private.can_view_trip(private.booking_trip_id(booking_id)));

CREATE POLICY booking_travelers_insert_editable_trip ON public.booking_travelers
FOR INSERT TO authenticated
WITH CHECK (
  private.can_edit_trip(private.booking_trip_id(booking_id))
  AND private.traveler_is_on_trip(
    private.booking_trip_id(booking_id),
    traveler_id
  )
);

CREATE POLICY booking_travelers_update_editable_trip ON public.booking_travelers
FOR UPDATE TO authenticated
USING (private.can_edit_trip(private.booking_trip_id(booking_id)))
WITH CHECK (
  private.can_edit_trip(private.booking_trip_id(booking_id))
  AND private.traveler_is_on_trip(
    private.booking_trip_id(booking_id),
    traveler_id
  )
);

CREATE POLICY booking_travelers_delete_editable_trip ON public.booking_travelers
FOR DELETE TO authenticated
USING (private.can_edit_trip(private.booking_trip_id(booking_id)));

-- Shared reference/cache data is readable but has no user-facing write grant.
CREATE POLICY places_select_authenticated ON public.places
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY route_legs_select_authenticated ON public.route_legs
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY country_rules_select_authenticated ON public.country_rules
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY public_holidays_select_authenticated ON public.public_holidays
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY expenses_select_visible_trip ON public.expenses
FOR SELECT TO authenticated
USING (private.can_view_trip(trip_id));

CREATE POLICY expenses_insert_editable_trip ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (
  private.can_edit_trip(trip_id)
  AND private.traveler_is_on_trip(trip_id, payer_traveler_id)
  AND (
    booking_id IS NULL
    OR private.booking_trip_id(booking_id) = trip_id
  )
);

CREATE POLICY expenses_update_editable_trip ON public.expenses
FOR UPDATE TO authenticated
USING (private.can_edit_trip(trip_id))
WITH CHECK (
  private.can_edit_trip(trip_id)
  AND private.traveler_is_on_trip(trip_id, payer_traveler_id)
  AND (
    booking_id IS NULL
    OR private.booking_trip_id(booking_id) = trip_id
  )
);

CREATE POLICY expenses_delete_editable_trip ON public.expenses
FOR DELETE TO authenticated
USING (private.can_edit_trip(trip_id));

CREATE POLICY expense_shares_select_visible_trip ON public.expense_shares
FOR SELECT TO authenticated
USING (private.can_view_trip(private.expense_trip_id(expense_id)));

CREATE POLICY expense_shares_insert_editable_trip ON public.expense_shares
FOR INSERT TO authenticated
WITH CHECK (
  private.can_edit_trip(private.expense_trip_id(expense_id))
  AND private.traveler_is_on_trip(
    private.expense_trip_id(expense_id),
    traveler_id
  )
);

CREATE POLICY expense_shares_update_editable_trip ON public.expense_shares
FOR UPDATE TO authenticated
USING (private.can_edit_trip(private.expense_trip_id(expense_id)))
WITH CHECK (
  private.can_edit_trip(private.expense_trip_id(expense_id))
  AND private.traveler_is_on_trip(
    private.expense_trip_id(expense_id),
    traveler_id
  )
);

CREATE POLICY expense_shares_delete_editable_trip ON public.expense_shares
FOR DELETE TO authenticated
USING (private.can_edit_trip(private.expense_trip_id(expense_id)));

-- Raw inputs belong only to the submitting account. They are intentionally
-- not deletable because the ingestion contract keeps them for replay.
CREATE POLICY raw_ingestions_select_owned ON public.raw_ingestions
FOR SELECT TO authenticated
USING (owner_id = private.current_account_id());

CREATE POLICY raw_ingestions_insert_owned ON public.raw_ingestions
FOR INSERT TO authenticated
WITH CHECK (
  owner_id = private.current_account_id()
  AND (trip_id IS NULL OR private.can_edit_trip(trip_id))
);

CREATE POLICY raw_ingestions_update_owned ON public.raw_ingestions
FOR UPDATE TO authenticated
USING (owner_id = private.current_account_id())
WITH CHECK (
  owner_id = private.current_account_id()
  AND (trip_id IS NULL OR private.can_edit_trip(trip_id))
);

COMMIT;
