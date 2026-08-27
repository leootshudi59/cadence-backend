-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- WARNING: NOTHING SHIPS PUBLICLY BEFORE THE AUTH + RLS POLICIES SESSION.
-- RLS IS FORCED BELOW WITHOUT POLICIES; ONLY THE PRIVILEGED API CONNECTION
-- CAN ACCESS THESE TABLES UNTIL AUTHENTICATION AND POLICIES ARE IMPLEMENTED.
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

-- CreateEnum
CREATE TYPE "DietaryKind" AS ENUM ('DIET', 'ALLERGY', 'INTOLERANCE', 'RELIGIOUS');

-- CreateEnum
CREATE TYPE "DietarySeverity" AS ENUM ('PREFERENCE', 'STRICT', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "FamilyRelation" AS ENUM ('PARENT_OF', 'GUARDIAN_OF', 'SPOUSE_OF', 'SIBLING_OF');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'VISA', 'RESIDENCE_PERMIT', 'DRIVING_LICENSE', 'IDP', 'INSURANCE', 'EHIC', 'VACCINATION', 'MINOR_EXIT_AUTHORIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNED', 'ONGOING', 'PAST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('FLIGHT', 'TRAIN', 'BUS', 'FERRY', 'CAR_RENTAL', 'TRANSFER', 'ACCOMMODATION', 'RESTAURANT', 'ACTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('AIRPORT', 'STATION', 'PORT', 'HOTEL', 'RESTAURANT', 'MUSEUM', 'ATTRACTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PlaceProvider" AS ENUM ('OSM', 'MANUAL');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('FOOT', 'CAR', 'TRANSIT', 'BIKE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TRANSPORT', 'ACCOMMODATION', 'FOOD', 'ACTIVITY', 'SHOPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('EQUAL', 'SHARES', 'EXACT', 'PERCENT');

-- CreateEnum
CREATE TYPE "IngestionSource" AS ENUM ('EMAIL', 'PDF', 'IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'EXTRACTED', 'NEEDS_REVIEW', 'FAILED', 'DISCARDED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr-FR',
    "home_iana_zone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "base_currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "ingestion_alias" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "account_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" DATE,
    "nationality" CHAR(2),
    "residence_country" CHAR(2),
    "earliest_wake_time" TIME(6),
    "latest_end_time" TIME(6),
    "max_activities_per_day" INTEGER,
    "break_minutes_per_day" INTEGER,
    "nap_required" BOOLEAN NOT NULL DEFAULT false,
    "nap_window_start" TIME(6),
    "nap_window_end" TIME(6),
    "prefers_local_over_touristic" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "traveler_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_health" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "traveler_id" UUID NOT NULL,
    "wheelchair_user" BOOLEAN NOT NULL DEFAULT false,
    "max_walk_km_per_day" DECIMAL(5,2),
    "stairs_ok" BOOLEAN NOT NULL DEFAULT true,
    "needs_elevator" BOOLEAN NOT NULL DEFAULT false,
    "mobility_notes" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "traveler_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_dietary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "traveler_id" UUID NOT NULL,
    "kind" "DietaryKind" NOT NULL,
    "label" TEXT NOT NULL,
    "severity" "DietarySeverity" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "traveler_dietary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "traveler_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "doses_per_day" DECIMAL(5,2) NOT NULL,
    "units_on_hand" INTEGER,
    "requires_refrigeration" BOOLEAN NOT NULL DEFAULT false,
    "requires_prescription_abroad" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "traveler_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_traveler_id" UUID NOT NULL,
    "to_traveler_id" UUID NOT NULL,
    "relation" "FamilyRelation" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "traveler_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "label" TEXT,
    "issuing_country" CHAR(2),
    "number_ciphertext" BYTEA,
    "number_iv" BYTEA,
    "number_salt" BYTEA,
    "issued_on" DATE,
    "expires_on" DATE,
    "storage_path" TEXT,
    "storage_iv" BYTEA,
    "storage_salt" BYTEA,
    "covers_countries" CHAR(2)[] DEFAULT ARRAY[]::CHAR(2)[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "travel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "destination_country" CHAR(2) NOT NULL,
    "place_id" UUID,
    "iana_zone" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "TripStatus" NOT NULL,
    "budget_amount" DECIMAL(14,2),
    "budget_currency" CHAR(3),
    "base_currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "cover_image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL,
    "traveler_id" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "invite_status" "InviteStatus" NOT NULL,
    "can_view_documents" BOOLEAN NOT NULL DEFAULT false,
    "invited_at" TIMESTAMPTZ(6) NOT NULL,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "trip_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL,
    "type" "BookingType" NOT NULL,
    "title" TEXT NOT NULL,
    "provider_name" TEXT,
    "confirmation_number" TEXT,
    "status" "BookingStatus" NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "start_iana_zone" TEXT NOT NULL,
    "start_place_id" UUID,
    "end_at" TIMESTAMPTZ(6),
    "end_iana_zone" TEXT,
    "end_place_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "verification_status" "VerificationStatus" NOT NULL,
    "extraction_confidence" DECIMAL(4,3),
    "raw_ingestion_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_travelers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "traveler_id" UUID NOT NULL,
    "seat" TEXT,
    "ticket_number" TEXT,

    CONSTRAINT "booking_travelers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" CHAR(2),
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "iana_zone" TEXT NOT NULL,
    "iata_code" TEXT,
    "category" "PlaceCategory" NOT NULL,
    "provider" "PlaceProvider" NOT NULL,
    "provider_place_id" TEXT,
    "opening_hours" JSONB,
    "seasonal_closure" JSONB,
    "requires_booking" BOOLEAN,
    "wheelchair_accessible" BOOLEAN,
    "has_stairs" BOOLEAN,
    "indoor_walk_margin_m" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_legs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_place_id" UUID NOT NULL,
    "to_place_id" UUID NOT NULL,
    "mode" "TravelMode" NOT NULL,
    "distance_m" INTEGER NOT NULL,
    "duration_s" INTEGER NOT NULL,
    "geometry" JSONB,
    "provider" TEXT NOT NULL DEFAULT 'openrouteservice',
    "computed_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "route_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nationality_country" CHAR(2) NOT NULL,
    "destination_country" CHAR(2) NOT NULL,
    "passport_min_validity_months" INTEGER NOT NULL DEFAULT 6,
    "visa_required" BOOLEAN NOT NULL,
    "visa_notes" TEXT,
    "minor_exit_authorization_required" BOOLEAN NOT NULL DEFAULT false,
    "idp_required" BOOLEAN NOT NULL DEFAULT false,
    "ehic_accepted" BOOLEAN NOT NULL DEFAULT false,
    "required_vaccinations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_url" TEXT,
    "valid_from" DATE,
    "valid_to" DATE,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country" CHAR(2) NOT NULL,
    "region" TEXT,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL,
    "booking_id" UUID,
    "payer_traveler_id" UUID NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "fx_rate" DECIMAL(18,8),
    "amount_base" DECIMAL(14,2),
    "base_currency" CHAR(3) NOT NULL,
    "spent_at" TIMESTAMPTZ(6) NOT NULL,
    "iana_zone" TEXT NOT NULL,
    "split_mode" "SplitMode" NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "receipt_storage_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expense_id" UUID NOT NULL,
    "traveler_id" UUID NOT NULL,
    "share_weight" DECIMAL(8,4),
    "amount_owed" DECIMAL(14,2) NOT NULL,
    "amount_owed_base" DECIMAL(14,2),
    "settled_at" TIMESTAMPTZ(6),

    CONSTRAINT "expense_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_ingestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "trip_id" UUID,
    "source" "IngestionSource" NOT NULL,
    "sender_address" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "content_type" TEXT,
    "raw_storage_path" TEXT,
    "raw_text" TEXT,
    "checksum" TEXT NOT NULL,
    "status" "IngestionStatus" NOT NULL,
    "model_id" TEXT,
    "prompt_version" TEXT,
    "extracted_json" JSONB,
    "confidence" DECIMAL(4,3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_ingestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_ingestion_alias_key" ON "profiles"("ingestion_alias");

-- CreateIndex
CREATE UNIQUE INDEX "traveler_profiles_account_id_key" ON "traveler_profiles"("account_id");

-- CreateIndex
CREATE INDEX "traveler_profiles_owner_id_idx" ON "traveler_profiles"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "traveler_health_traveler_id_key" ON "traveler_health"("traveler_id");

-- CreateIndex
CREATE UNIQUE INDEX "traveler_dietary_traveler_id_kind_label_key" ON "traveler_dietary"("traveler_id", "kind", "label");

-- CreateIndex
CREATE UNIQUE INDEX "family_links_from_traveler_id_to_traveler_id_relation_key" ON "family_links"("from_traveler_id", "to_traveler_id", "relation");

-- CreateIndex
CREATE INDEX "travel_documents_traveler_id_type_idx" ON "travel_documents"("traveler_id", "type");

-- CreateIndex
CREATE INDEX "travel_documents_expires_on_idx" ON "travel_documents"("expires_on");

-- CreateIndex
CREATE INDEX "trips_owner_id_start_date_idx" ON "trips"("owner_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "trip_participants_trip_id_traveler_id_key" ON "trip_participants"("trip_id", "traveler_id");

-- CreateIndex
CREATE INDEX "bookings_trip_id_start_at_idx" ON "bookings"("trip_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_travelers_booking_id_traveler_id_key" ON "booking_travelers"("booking_id", "traveler_id");

-- CreateIndex
CREATE INDEX "places_iata_code_idx" ON "places"("iata_code");

-- CreateIndex
CREATE UNIQUE INDEX "places_provider_provider_place_id_key" ON "places"("provider", "provider_place_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_legs_from_place_id_to_place_id_mode_key" ON "route_legs"("from_place_id", "to_place_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "country_rules_nationality_country_destination_country_key" ON "country_rules"("nationality_country", "destination_country");

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_country_region_date_key" ON "public_holidays"("country", "region", "date");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_booking_id_key" ON "expenses"("booking_id");

-- CreateIndex
CREATE INDEX "expenses_trip_id_spent_at_idx" ON "expenses"("trip_id", "spent_at");

-- CreateIndex
CREATE UNIQUE INDEX "expense_shares_expense_id_traveler_id_key" ON "expense_shares"("expense_id", "traveler_id");

-- CreateIndex
CREATE INDEX "raw_ingestions_status_received_at_idx" ON "raw_ingestions"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "raw_ingestions_owner_id_checksum_key" ON "raw_ingestions"("owner_id", "checksum");

-- AddForeignKey
ALTER TABLE "traveler_profiles" ADD CONSTRAINT "traveler_profiles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_profiles" ADD CONSTRAINT "traveler_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_health" ADD CONSTRAINT "traveler_health_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_dietary" ADD CONSTRAINT "traveler_dietary_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_medications" ADD CONSTRAINT "traveler_medications_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_from_traveler_id_fkey" FOREIGN KEY ("from_traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_to_traveler_id_fkey" FOREIGN KEY ("to_traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_start_place_id_fkey" FOREIGN KEY ("start_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_end_place_id_fkey" FOREIGN KEY ("end_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_raw_ingestion_id_fkey" FOREIGN KEY ("raw_ingestion_id") REFERENCES "raw_ingestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_travelers" ADD CONSTRAINT "booking_travelers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_travelers" ADD CONSTRAINT "booking_travelers_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_legs" ADD CONSTRAINT "route_legs_from_place_id_fkey" FOREIGN KEY ("from_place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_legs" ADD CONSTRAINT "route_legs_to_place_id_fkey" FOREIGN KEY ("to_place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payer_traveler_id_fkey" FOREIGN KEY ("payer_traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_shares" ADD CONSTRAINT "expense_shares_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_shares" ADD CONSTRAINT "expense_shares_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_ingestions" ADD CONSTRAINT "raw_ingestions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_ingestions" ADD CONSTRAINT "raw_ingestions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written constraints and security controls that Prisma cannot emit.
CREATE UNIQUE INDEX "bookings_trip_id_confirmation_number_key"
ON "bookings"("trip_id", "confirmation_number")
WHERE "confirmation_number" IS NOT NULL;

ALTER TABLE "trips"
ADD CONSTRAINT "trips_dates_check"
CHECK ("end_date" >= "start_date");

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_dates_check"
CHECK ("end_at" IS NULL OR "end_at" >= "start_at");

ALTER TABLE "family_links"
ADD CONSTRAINT "family_links_no_self_reference_check"
CHECK ("from_traveler_id" <> "to_traveler_id");

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "traveler_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "traveler_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "traveler_health" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "traveler_health" FORCE ROW LEVEL SECURITY;
ALTER TABLE "traveler_dietary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "traveler_dietary" FORCE ROW LEVEL SECURITY;
ALTER TABLE "traveler_medications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "traveler_medications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "family_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "family_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE "travel_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "travel_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trip_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_participants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "booking_travelers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_travelers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "places" FORCE ROW LEVEL SECURITY;
ALTER TABLE "route_legs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_legs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "country_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "country_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public_holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public_holidays" FORCE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "expense_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_shares" FORCE ROW LEVEL SECURITY;
ALTER TABLE "raw_ingestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "raw_ingestions" FORCE ROW LEVEL SECURITY;

-- Prisma CLI infrastructure is not user data and must remain accessible to
-- Prisma Migrate, but it must not be exposed through Supabase's REST roles.
-- The table is absent while Prisma replays this file in its shadow database.
DO $$
BEGIN
    IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated';
    END IF;
END
$$;
