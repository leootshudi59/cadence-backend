/*
  Warnings:

  - You are about to drop the column `provider` on the `places` table. All the data in the column will be lost.
  - You are about to drop the column `provider_place_id` on the `places` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "places_provider_provider_place_id_key";

-- AlterTable
ALTER TABLE "places" DROP COLUMN "provider",
DROP COLUMN "provider_place_id";

-- DropEnum
DROP TYPE "PlaceProvider";

-- CreateTable
CREATE TABLE "data_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" CHAR(2),
    "source_url" TEXT,
    "license" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "place_id" UUID NOT NULL,
    "data_source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_code" TEXT,
    "raw_data" JSONB,
    "source_updated_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "place_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_code_key" ON "data_sources"("code");

-- CreateIndex
CREATE INDEX "place_sources_place_id_idx" ON "place_sources"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "place_sources_data_source_id_external_id_key" ON "place_sources"("data_source_id", "external_id");

-- AddForeignKey
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS: geographic reference tables
-- ---------------------------------------------------------------------------

ALTER TABLE "data_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_sources" FORCE ROW LEVEL SECURITY;

ALTER TABLE "place_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "place_sources" FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Runtime privileges and RLS policies
--
-- Supabase-specific roles may not exist in Prisma's shadow database.
-- Apply their grants/policies only when the roles are available.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'anon'
    ) THEN
        REVOKE ALL ON TABLE "data_sources" FROM anon;
        REVOKE ALL ON TABLE "place_sources" FROM anon;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'authenticated'
    ) THEN
        REVOKE INSERT, UPDATE, DELETE
        ON TABLE "data_sources"
        FROM authenticated;

        REVOKE INSERT, UPDATE, DELETE
        ON TABLE "place_sources"
        FROM authenticated;

        GRANT SELECT
        ON TABLE "data_sources"
        TO authenticated;

        GRANT SELECT
        ON TABLE "place_sources"
        TO authenticated;

        EXECUTE '
            CREATE POLICY "data_sources_authenticated_read"
            ON "data_sources"
            FOR SELECT
            TO authenticated
            USING (true)
        ';

        EXECUTE '
            CREATE POLICY "place_sources_authenticated_read"
            ON "place_sources"
            FOR SELECT
            TO authenticated
            USING (true)
        ';
    END IF;
END
$$;