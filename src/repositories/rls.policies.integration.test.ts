import { ConfigService } from "@nestjs/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BookingStatus,
  BookingType,
  DietaryKind,
  DietarySeverity,
  DocumentType,
  InviteStatus,
  ParticipantRole,
  TripStatus,
  VerificationStatus,
} from "../generated/prisma";
import type { RequestAuth, VerifiedSupabaseClaims } from "../auth/types";
import {
  hasRlsRuntimeEnvironment,
  loadRuntimeEnvironment,
} from "../config/environment";
import { createInstant } from "../domain/time";
import { PrismaService } from "./prisma.service";
import { RlsUnitOfWork } from "./rls-unit-of-work";
import type { RlsOperation } from "./types";

const ids = {
  accountA: "91000000-0000-4000-8000-000000000001",
  accountB: "91000000-0000-4000-8000-000000000002",
  travelerA: "92000000-0000-4000-8000-000000000001",
  travelerB: "92000000-0000-4000-8000-000000000002",
  trip: "93000000-0000-4000-8000-000000000001",
  documentA: "94000000-0000-4000-8000-000000000001",
  forbiddenBooking: "95000000-0000-4000-8000-000000000001",
} as const;

const applicationTables = [
  "booking_travelers",
  "bookings",
  "country_rules",
  "expense_shares",
  "expenses",
  "family_links",
  "places",
  "profiles",
  "public_holidays",
  "raw_ingestions",
  "route_legs",
  "travel_documents",
  "traveler_dietary",
  "traveler_health",
  "traveler_medications",
  "traveler_profiles",
  "trip_participants",
  "trips",
] as const;

function claimsFor(accountId: string): VerifiedSupabaseClaims {
  return {
    aud: "authenticated",
    exp: 4_102_444_800,
    iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
    role: "authenticated",
    sub: accountId,
  };
}

type BoundRlsSession = <T>(operation: RlsOperation<T>) => Promise<T>;

let prisma: PrismaService;
let rlsUnitOfWork: RlsUnitOfWork;

function authFor(accountId: string): RequestAuth {
  return {
    accountId,
    userId: accountId,
    travelerProfileId: null,
    claims: claimsFor(accountId),
  };
}

const asAccountA: BoundRlsSession = (operation) =>
  rlsUnitOfWork.execute(authFor(ids.accountA), operation);
const asAccountB: BoundRlsSession = (operation) =>
  rlsUnitOfWork.execute(authFor(ids.accountB), operation);

function dbInstant(iso: string) {
  return createInstant({ local: iso, ianaZone: "UTC" }).toJSDate();
}

async function resetFixture(): Promise<void> {
  await asAccountA(async (transaction) => {
    await transaction.trip.deleteMany({ where: { id: ids.trip } });
    await transaction.travelerProfile.deleteMany({
      where: { id: ids.travelerA },
    });
  });

  await asAccountB(async (transaction) => {
    await transaction.travelerProfile.deleteMany({
      where: { id: ids.travelerB },
    });
  });
}

async function createAccountFixture(
  runWithRLS: BoundRlsSession,
  input: {
    accountId: string;
    displayName: string;
    email: string;
    travelerId: string;
  },
): Promise<void> {
  await runWithRLS(async (transaction) => {
    await transaction.profile.upsert({
      where: { id: input.accountId },
      update: {
        displayName: input.displayName,
        email: input.email,
      },
      create: {
        id: input.accountId,
        displayName: input.displayName,
        email: input.email,
      },
    });

    await transaction.travelerProfile.create({
      data: {
        id: input.travelerId,
        accountId: input.accountId,
        ownerId: input.accountId,
        firstName: input.displayName,
        lastName: "Policy test",
      },
    });

    await transaction.travelerHealth.create({
      data: {
        travelerId: input.travelerId,
        conditions: [{ label: `${input.displayName} private condition` }],
        maxWalkKmPerDay: input.accountId === ids.accountA ? 5 : 8,
      },
    });

    await transaction.travelerDietary.create({
      data: {
        travelerId: input.travelerId,
        kind: DietaryKind.ALLERGY,
        label: `${input.displayName.toUpperCase()}_PRIVATE_ALLERGY`,
        severity: DietarySeverity.STRICT,
      },
    });

    await transaction.travelerMedication.create({
      data: {
        travelerId: input.travelerId,
        label: `${input.displayName} private medication`,
        dosesPerDay: 1,
      },
    });
  });
}

describe.skipIf(!hasRlsRuntimeEnvironment())(
  "all-table RLS policy integration",
  () => {
    beforeAll(async () => {
      const runtime = loadRuntimeEnvironment();
      prisma = new PrismaService(
        new ConfigService({
          database: { rlsDatabaseUrl: runtime.rlsDatabaseUrl },
        }),
      );
      await prisma.onModuleInit();
      rlsUnitOfWork = new RlsUnitOfWork(prisma);
      await resetFixture();

      await createAccountFixture(asAccountA, {
        accountId: ids.accountA,
        displayName: "Policy A",
        email: "rls-policy-a@seed.cadence.local",
        travelerId: ids.travelerA,
      });
      await createAccountFixture(asAccountB, {
        accountId: ids.accountB,
        displayName: "Policy B",
        email: "rls-policy-b@seed.cadence.local",
        travelerId: ids.travelerB,
      });

      await asAccountA(async (transaction) => {
        await transaction.travelDocument.create({
          data: {
            id: ids.documentA,
            travelerId: ids.travelerA,
            type: DocumentType.PASSPORT,
            label: "A private passport",
          },
        });

        await transaction.trip.create({
          data: {
            id: ids.trip,
            ownerId: ids.accountA,
            title: "A private policy trip",
            destinationCity: "Lyon",
            destinationCountry: "FR",
            ianaZone: "Europe/Paris",
            startDate: dbInstant("2027-04-01T00:00:00.000Z"),
            endDate: dbInstant("2027-04-03T00:00:00.000Z"),
            status: TripStatus.PLANNED,
          },
        });

        await transaction.tripParticipant.create({
          data: {
            tripId: ids.trip,
            travelerId: ids.travelerA,
            role: ParticipantRole.OWNER,
            inviteStatus: InviteStatus.ACCEPTED,
            invitedAt: dbInstant("2027-01-01T00:00:00.000Z"),
            respondedAt: dbInstant("2027-01-01T00:00:00.000Z"),
          },
        });
      });
    });

    afterAll(async () => {
      await resetFixture();
      await prisma.onModuleDestroy();
    });

    it("has forced RLS and at least one policy on every application table", async () => {
      const rows = await asAccountA(
        async (transaction) =>
          transaction.$queryRaw<
            {
              policy_count: bigint;
              relforcerowsecurity: boolean;
              relname: string;
              relrowsecurity: boolean;
            }[]
          >`
          SELECT tables.relname,
                 tables.relrowsecurity,
                 tables.relforcerowsecurity,
                 count(policies.policyname) AS policy_count
          FROM pg_class AS tables
          LEFT JOIN pg_policies AS policies
            ON policies.schemaname = 'public'
           AND policies.tablename = tables.relname
          WHERE tables.relnamespace = 'public'::regnamespace
            AND tables.relkind = 'r'
            AND tables.relname <> '_prisma_migrations'
          GROUP BY tables.relname,
                   tables.relrowsecurity,
                   tables.relforcerowsecurity
          ORDER BY tables.relname
        `,
      );

      expect(rows.map((row) => row.relname)).toEqual(applicationTables);
      expect(
        rows.every(
          (row) =>
            row.relrowsecurity &&
            row.relforcerowsecurity &&
            row.policy_count > 0n,
        ),
      ).toBe(true);
    });

    it("keeps A's trip hidden from B before accepted membership", async () => {
      const [tripsForA, tripsForB] = await Promise.all([
        asAccountA((transaction) =>
          transaction.trip.findMany({ where: { id: ids.trip } }),
        ),
        asAccountB((transaction) =>
          transaction.trip.findMany({ where: { id: ids.trip } }),
        ),
      ]);

      expect(tripsForA).toHaveLength(1);
      expect(tripsForB).toEqual([]);
    });

    it("lets accepted B read A's trip without inheriting document access", async () => {
      await asAccountA((transaction) =>
        transaction.tripParticipant.create({
          data: {
            tripId: ids.trip,
            travelerId: ids.travelerB,
            role: ParticipantRole.VIEWER,
            inviteStatus: InviteStatus.ACCEPTED,
            canViewDocuments: false,
            invitedAt: dbInstant("2027-01-02T00:00:00.000Z"),
            respondedAt: dbInstant("2027-01-02T00:00:00.000Z"),
          },
        }),
      );

      const resultForB = await asAccountB(async (transaction) => ({
        documents: await transaction.travelDocument.findMany({
          where: { id: ids.documentA },
        }),
        trips: await transaction.trip.findMany({ where: { id: ids.trip } }),
      }));

      expect(resultForB.trips).toHaveLength(1);
      expect(resultForB.documents).toEqual([]);
    });

    it("never exposes the other user's health, dietary, or medication rows", async () => {
      const [sensitiveForA, sensitiveForB] = await Promise.all([
        asAccountA(async (transaction) => ({
          dietary: await transaction.travelerDietary.findMany(),
          health: await transaction.travelerHealth.findMany(),
          medications: await transaction.travelerMedication.findMany(),
        })),
        asAccountB(async (transaction) => ({
          dietary: await transaction.travelerDietary.findMany(),
          health: await transaction.travelerHealth.findMany(),
          medications: await transaction.travelerMedication.findMany(),
        })),
      ]);

      expect(sensitiveForA.health.map((row) => row.travelerId)).toEqual([
        ids.travelerA,
      ]);
      expect(sensitiveForB.health.map((row) => row.travelerId)).toEqual([
        ids.travelerB,
      ]);
      expect(sensitiveForA.dietary.map((row) => row.travelerId)).toEqual([
        ids.travelerA,
      ]);
      expect(sensitiveForB.dietary.map((row) => row.travelerId)).toEqual([
        ids.travelerB,
      ]);
      expect(sensitiveForA.medications.map((row) => row.travelerId)).toEqual([
        ids.travelerA,
      ]);
      expect(sensitiveForB.medications.map((row) => row.travelerId)).toEqual([
        ids.travelerB,
      ]);
    });

    it("rejects B's write to A's trip instead of silently dropping it", async () => {
      await expect(
        asAccountB((transaction) =>
          transaction.booking.create({
            data: {
              id: ids.forbiddenBooking,
              tripId: ids.trip,
              type: BookingType.OTHER,
              title: "B must not add this",
              status: BookingStatus.CONFIRMED,
              startAt: dbInstant("2027-04-02T12:00:00.000Z"),
              startIanaZone: "Europe/Paris",
              verificationStatus: VerificationStatus.VERIFIED,
            },
          }),
        ),
      ).rejects.toThrow(/row-level security|permission denied/i);

      const forbiddenRows = await asAccountA((transaction) =>
        transaction.booking.findMany({
          where: { id: ids.forbiddenBooking },
        }),
      );
      expect(forbiddenRows).toEqual([]);
    });

    it("keeps reference tables read-only to the runtime role", async () => {
      await asAccountA((transaction) => transaction.countryRule.findMany());

      await expect(
        asAccountA((transaction) =>
          transaction.countryRule.create({
            data: {
              nationalityCountry: "ZZ",
              destinationCountry: "ZY",
              visaRequired: false,
            },
          }),
        ),
      ).rejects.toThrow(/permission denied|row-level security/i);
    });
  },
);
