-- SELECT privileges let PostgreSQL reach policy evaluation. With FORCE RLS
-- and no policies, rls_client still sees zero rows and cannot write any rows.
-- Prisma's migration-history table is intentionally excluded.

GRANT SELECT ON TABLE
  public."profiles",
  public."traveler_profiles",
  public."traveler_health",
  public."traveler_dietary",
  public."traveler_medications",
  public."family_links",
  public."travel_documents",
  public."trips",
  public."trip_participants",
  public."bookings",
  public."booking_travelers",
  public."places",
  public."route_legs",
  public."country_rules",
  public."public_holidays",
  public."expenses",
  public."expense_shares",
  public."raw_ingestions"
TO rls_client;
