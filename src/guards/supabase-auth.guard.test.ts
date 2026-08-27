import { Controller, Get, Module, type INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseJwtVerifier } from "../auth/supabase-jwt-verifier";
import type { RequestAuth, VerifiedSupabaseClaims } from "../auth/types";
import { IDENTITY_REPOSITORY } from "../constants/repository-tokens.constants";
import { CurrentAuth } from "../decorators/current-auth.decorator";
import { Public } from "../decorators/public.decorator";
import { ApiExceptionFilter } from "../filters/api-exception.filter";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

const accountId = "10000000-0000-4000-8000-000000000001";
const travelerProfileId = "20000000-0000-4000-8000-000000000001";
const claims: VerifiedSupabaseClaims = {
  aud: "authenticated",
  exp: 4_102_444_800,
  iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
  role: "authenticated",
  sub: accountId,
};

@Controller()
class GuardTestController {
  @Get("health")
  @Public()
  health(): { ok: true } {
    return { ok: true };
  }

  @Get("not-health")
  @Public()
  notActuallyPublic(): { ok: true } {
    return { ok: true };
  }

  @Get("private-test")
  privateRoute(@CurrentAuth() auth: RequestAuth): {
    accountId: string;
    travelerProfileId: string | null;
    userId: string;
  } {
    return {
      accountId: auth.accountId,
      travelerProfileId: auth.travelerProfileId,
      userId: auth.userId,
    };
  }
}

@Module({
  controllers: [GuardTestController],
})
class GuardTestModule {}

function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

describe("SupabaseAuthGuard", () => {
  let app: INestApplication;
  const verify = vi.fn<(token: string) => Promise<VerifiedSupabaseClaims>>();
  const resolveTraveler = vi.fn<() => Promise<string | null>>();

  beforeEach(async () => {
    verify.mockImplementation((token) =>
      token === "valid"
        ? Promise.resolve(claims)
        : Promise.reject(new Error("Invalid token")),
    );
    resolveTraveler.mockResolvedValue(travelerProfileId);

    const moduleRef = await Test.createTestingModule({
      imports: [GuardTestModule],
      providers: [
        Reflector,
        SupabaseAuthGuard,
        { provide: SupabaseJwtVerifier, useValue: { verify } },
        {
          provide: RlsUnitOfWork,
          useValue: {
            executeWithVerifiedClaims: (
              _claims: VerifiedSupabaseClaims,
              operation: (transaction: object) => Promise<unknown>,
            ) => operation({}),
          },
        },
        {
          provide: IDENTITY_REPOSITORY,
          useValue: {
            findCurrentTravelerProfileId: resolveTraveler,
          },
        },
        { provide: APP_GUARD, useExisting: SupabaseAuthGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("keeps only GET /health public", async () => {
    await request(httpServer(app)).get("/health").expect(200);
    await request(httpServer(app)).get("/not-health").expect(401, {
      error: "Unauthorized",
    });
  });

  it("rejects missing and invalid bearer tokens", async () => {
    await request(httpServer(app)).get("/private-test").expect(401, {
      error: "Unauthorized",
    });
    await request(httpServer(app))
      .get("/private-test")
      .set("Authorization", "Bearer invalid")
      .expect(401, { error: "Unauthorized" });
  });

  it("keeps account and traveler-profile identity separate", async () => {
    const response = await request(httpServer(app))
      .get("/private-test")
      .set("Authorization", "Bearer valid")
      .expect(200);

    expect(response.body).toEqual({
      accountId,
      travelerProfileId,
      userId: accountId,
    });
  });

  it("fails closed when the database identity context cannot initialize", async () => {
    resolveTraveler.mockRejectedValueOnce(new Error("Database unavailable"));

    await request(httpServer(app))
      .get("/private-test")
      .set("Authorization", "Bearer valid")
      .expect(503, { error: "Service unavailable" });
  });
});
