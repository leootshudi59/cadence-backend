import { ConfigService } from "@nestjs/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestAuth, VerifiedSupabaseClaims } from "../auth/types";
import {
  hasRlsRuntimeEnvironment,
  loadRuntimeEnvironment,
} from "../config/environment";
import { IdentityRepository } from "./identity.repository";
import { PrismaService } from "./prisma.service";
import { RlsUnitOfWork } from "./rls-unit-of-work";

const accountId = "10000000-0000-4000-8000-000000000001";
const linkedTravelerProfileId = "20000000-0000-4000-8000-000000000001";
const claims: VerifiedSupabaseClaims = {
  aud: "authenticated",
  exp: 4_102_444_800,
  iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
  role: "authenticated",
  sub: accountId,
};
const auth: RequestAuth = {
  accountId,
  userId: accountId,
  travelerProfileId: linkedTravelerProfileId,
  claims,
};

describe.skipIf(!hasRlsRuntimeEnvironment())(
  "rls_client database integration",
  () => {
    let prisma: PrismaService;
    let rlsUnitOfWork: RlsUnitOfWork;
    const identityRepository = new IdentityRepository();

    beforeAll(async () => {
      const runtime = loadRuntimeEnvironment();
      prisma = new PrismaService(
        new ConfigService({
          database: { rlsDatabaseUrl: runtime.rlsDatabaseUrl },
        }),
      );
      await prisma.onModuleInit();
      rlsUnitOfWork = new RlsUnitOfWork(prisma);
    });

    afterAll(async () => {
      await prisma.onModuleDestroy();
    });

    it("authenticates as rls_client, carries the account claim, and sees its policy-scoped trip", async () => {
      const result = await rlsUnitOfWork.execute(auth, async (transaction) => {
        const roleRows = await transaction.$queryRaw<
          { current_user: string; account_id: string | null }[]
        >`
            SELECT current_user,
                   current_setting('request.jwt.claims', TRUE)::jsonb ->> 'sub' AS account_id
          `;
        const trips = await transaction.trip.findMany({
          select: { id: true },
          where: { id: "30000000-0000-4000-8000-000000000001" },
        });
        const travelerProfileId =
          await identityRepository.findCurrentTravelerProfileId(transaction);

        return { role: roleRows[0], travelerProfileId, trips };
      });

      expect(result.role).toEqual({
        current_user: "rls_client",
        account_id: accountId,
      });
      expect(result.trips).toEqual([
        { id: "30000000-0000-4000-8000-000000000001" },
      ]);
      expect(result.travelerProfileId).toBe(linkedTravelerProfileId);
    });
  },
);
