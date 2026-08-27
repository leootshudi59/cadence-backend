import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppModule } from "../app.module";
import { configureApplication } from "../app.bootstrap";
import { SupabaseJwtVerifier } from "../auth/supabase-jwt-verifier";
import type { VerifiedSupabaseClaims } from "../auth/types";
import { IDENTITY_REPOSITORY } from "../constants/repository-tokens.constants";
import { PrismaService } from "../repositories/prisma.service";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

const accountId = "10000000-0000-4000-8000-000000000001";
const claims: VerifiedSupabaseClaims = {
  aud: "authenticated",
  exp: 4_102_444_800,
  iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
  role: "authenticated",
  sub: accountId,
};

const expectedPaths = [
  "/bookings/{bookingId}/travelers",
  "/bookings/{bookingId}/travelers/{bookingTravelerId}",
  "/health",
  "/openapi.json",
  "/profile",
  "/travelers",
  "/travelers/{travelerId}",
  "/trips",
  "/trips/{tripId}",
  "/trips/{tripId}/bookings",
  "/trips/{tripId}/bookings/{bookingId}",
  "/trips/{tripId}/participants",
  "/trips/{tripId}/participants/{participantId}",
] as const;

const expectedOperations = [
  ["get", "/health", 200],
  ["get", "/openapi.json", 200],
  ["get", "/profile", 200],
  ["put", "/profile", 200],
  ["post", "/travelers", 201],
  ["get", "/travelers", 200],
  ["get", "/travelers/{travelerId}", 200],
  ["patch", "/travelers/{travelerId}", 200],
  ["delete", "/travelers/{travelerId}", 200],
  ["post", "/trips", 201],
  ["get", "/trips", 200],
  ["get", "/trips/{tripId}", 200],
  ["patch", "/trips/{tripId}", 200],
  ["delete", "/trips/{tripId}", 200],
  ["post", "/trips/{tripId}/participants", 201],
  ["get", "/trips/{tripId}/participants", 200],
  ["get", "/trips/{tripId}/participants/{participantId}", 200],
  ["patch", "/trips/{tripId}/participants/{participantId}", 200],
  ["delete", "/trips/{tripId}/participants/{participantId}", 200],
  ["post", "/trips/{tripId}/bookings", 201],
  ["get", "/trips/{tripId}/bookings", 200],
  ["get", "/trips/{tripId}/bookings/{bookingId}", 200],
  ["patch", "/trips/{tripId}/bookings/{bookingId}", 200],
  ["delete", "/trips/{tripId}/bookings/{bookingId}", 200],
  ["post", "/bookings/{bookingId}/travelers", 201],
  ["get", "/bookings/{bookingId}/travelers", 200],
  ["get", "/bookings/{bookingId}/travelers/{bookingTravelerId}", 200],
  ["patch", "/bookings/{bookingId}/travelers/{bookingTravelerId}", 200],
  ["delete", "/bookings/{bookingId}/travelers/{bookingTravelerId}", 200],
] as const;

const openApiOperationSchema = z
  .object({
    responses: z.record(z.string(), z.unknown()),
    security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  })
  .passthrough();

const openApiContractSchema = z.object({
  openapi: z.string(),
  info: z.object({ title: z.string(), version: z.string() }).passthrough(),
  components: z
    .object({
      securitySchemes: z.object({
        bearerAuth: z
          .object({
            bearerFormat: z.string(),
            scheme: z.string(),
            type: z.string(),
          })
          .passthrough(),
      }),
    })
    .passthrough(),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
});

function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

describe("Nest Express and OpenAPI contract", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RlsUnitOfWork)
      .useValue({
        executeWithVerifiedClaims: (
          _claims: VerifiedSupabaseClaims,
          operation: (transaction: object) => Promise<unknown>,
        ) => operation({}),
      })
      .overrideProvider(IDENTITY_REPOSITORY)
      .useValue({
        findCurrentTravelerProfileId: vi.fn().mockResolvedValue(null),
      })
      .overrideProvider(SupabaseJwtVerifier)
      .useValue({
        verify: vi.fn((token: string) =>
          token === "valid"
            ? Promise.resolve(claims)
            : Promise.reject(new Error("Invalid token")),
        ),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await configureApplication(app as NestExpressApplication);
  });

  afterAll(async () => {
    await app.close();
  });

  it("runs on the default Express adapter and keeps only health public", async () => {
    expect(app.getHttpAdapter().getType()).toBe("express");
    await request(httpServer(app)).get("/health").expect(200);
    await request(httpServer(app)).get("/openapi.json").expect(401, {
      error: "Unauthorized",
    });
  });

  it("serves the authenticated OpenAPI document with every existing operation", async () => {
    const response = await request(httpServer(app))
      .get("/openapi.json")
      .set("Authorization", "Bearer valid")
      .expect(200);

    const document = openApiContractSchema.parse(response.body);

    expect(document.openapi).toBe("3.0.3");
    expect(document.info).toMatchObject({
      title: "Cadence API",
      version: "0.0.0",
    });
    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      bearerFormat: "JWT",
      scheme: "bearer",
      type: "http",
    });
    expect(Object.keys(document.paths).sort()).toEqual(expectedPaths);

    for (const [method, path, successStatus] of expectedOperations) {
      const operation = openApiOperationSchema.parse(
        document.paths[path]?.[method],
      );
      expect(operation, `${method.toUpperCase()} ${path}`).toBeDefined();
      expect(
        operation.responses[String(successStatus)],
        `${method.toUpperCase()} ${path} response ${successStatus}`,
      ).toBeDefined();
      if (path !== "/health") {
        expect(operation.security).toEqual([{ bearerAuth: [] }]);
      }
    }

    const operationCount = Object.values(document.paths).reduce(
      (count, pathItem) =>
        count +
        Object.keys(pathItem).filter((key) =>
          ["delete", "get", "patch", "post", "put"].includes(key),
        ).length,
      0,
    );
    expect(operationCount).toBe(29);
  });
});
