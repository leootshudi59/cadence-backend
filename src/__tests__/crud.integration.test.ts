import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { configureApplication } from "../app.bootstrap";
import { SupabaseJwtVerifier } from "../auth/supabase-jwt-verifier";
import type { RequestAuth, VerifiedSupabaseClaims } from "../auth/types";
import { hasRlsRuntimeEnvironment } from "../config/environment";
import {
  createBookingResponseSchema,
  listBookingsResponseSchema,
} from "../dtos/booking";
import { listBookingTravelersResponseSchema } from "../dtos/booking-traveler";
import { createParticipantResponseSchema } from "../dtos/participant";
import { putProfileResponseSchema } from "../dtos/profile";
import { createTravelerResponseSchema } from "../dtos/traveler";
import { createTripResponseSchema, getTripResponseSchema } from "../dtos/trip";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

const accountId = "96000000-0000-4000-8000-000000000001";
const missingTravelerId = "96000000-0000-4000-8000-000000000099";
const accessToken = "nest-hosted-integration-token";
const claims: VerifiedSupabaseClaims = {
  aud: "authenticated",
  email: "nest-integration@seed.cadence.local",
  exp: 4_102_444_800,
  iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
  role: "authenticated",
  sub: accountId,
};
const auth: RequestAuth = {
  accountId,
  claims,
  travelerProfileId: null,
  userId: accountId,
};

function authorization(testRequest: request.Test): request.Test {
  return testRequest.set("Authorization", `Bearer ${accessToken}`);
}

function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

function flightDetails(
  travelerId: string,
  bookingReference: string,
  secondDeparture = "2027-04-01T15:25",
) {
  return {
    type: "flight" as const,
    bookingReference,
    segments: [
      {
        airlineName: "Finnair",
        carrierCode: "AY",
        flightNumber: "1572",
        departure: {
          iataCode: "CDG",
          local: "2027-04-01T10:50",
          terminal: "2B",
        },
        arrival: {
          iataCode: "HEL",
          local: "2027-04-01T14:50",
        },
        travelers: [{ travelerId, seat: "12A" }],
      },
      {
        airlineName: "Finnair",
        carrierCode: "AY",
        flightNumber: "73",
        departure: {
          iataCode: "HEL",
          local: secondDeparture,
        },
        arrival: {
          iataCode: "NRT",
          local: "2027-04-02T12:55",
          terminal: "2",
        },
        travelers: [{ travelerId, seat: "12A" }],
      },
    ],
  };
}

describe.skipIf(!hasRlsRuntimeEnvironment())(
  "Nest hosted CRUD through rls_client",
  () => {
    let app: INestApplication;
    let rlsUnitOfWork: RlsUnitOfWork;
    let travelerId: string;
    let tripId: string;

    async function resetFixture(): Promise<void> {
      await rlsUnitOfWork.execute(auth, async (transaction) => {
        await transaction.trip.deleteMany({ where: { ownerId: accountId } });
        await transaction.travelerProfile.deleteMany({
          where: { ownerId: accountId },
        });
      });
    }

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(SupabaseJwtVerifier)
        .useValue({
          verify: vi.fn((token: string) =>
            token === accessToken
              ? Promise.resolve(claims)
              : Promise.reject(new Error("Invalid token")),
          ),
        })
        .compile();

      app = moduleRef.createNestApplication();
      await configureApplication(app as NestExpressApplication);
      rlsUnitOfWork = app.get(RlsUnitOfWork);
      await resetFixture();
    });

    afterAll(async () => {
      await resetFixture();
      await app.close();
    });

    it("creates profile → traveler → trip → participant → two-leg flight and reads it back", async () => {
      const profile = await authorization(
        request(httpServer(app)).put("/profile"),
      )
        .send({
          avatarUrl: null,
          baseCurrency: "EUR",
          displayName: "Nest Integration",
          homeIanaZone: "Europe/Paris",
          locale: "fr-FR",
        })
        .expect(200);
      const profileBody = putProfileResponseSchema.parse(profile.body);
      expect(profileBody).not.toHaveProperty("ingestionAlias");

      const traveler = await authorization(
        request(httpServer(app)).post("/travelers"),
      )
        .send({
          birthDate: "1990-05-14",
          firstName: "Nest",
          lastName: "Traveler",
          linkToAuthenticatedAccount: true,
          nationality: "FR",
          residenceCountry: "FR",
        })
        .expect(201);
      const travelerBody = createTravelerResponseSchema.parse(traveler.body);
      expect(travelerBody.accountId).toBe(accountId);
      travelerId = travelerBody.id;

      const trip = await authorization(request(httpServer(app)).post("/trips"))
        .send({
          baseCurrency: "EUR",
          destination: { iataCode: "NRT", source: "iata" },
          endDate: "2027-04-10",
          startDate: "2027-04-01",
          status: "planned",
          title: "Tokyo via Helsinki",
        })
        .expect(201);
      const tripBody = createTripResponseSchema.parse(trip.body);
      expect(tripBody).toMatchObject({
        destinationCity: "Tokyo",
        destinationCountry: "JP",
        ianaZone: "Asia/Tokyo",
      });
      tripId = tripBody.id;

      const participant = await authorization(
        request(httpServer(app)).post(`/trips/${tripId}/participants`),
      )
        .send({
          canViewDocuments: false,
          inviteStatus: "accepted",
          role: "owner",
          travelerId,
        })
        .expect(201);
      createParticipantResponseSchema.parse(participant.body);

      const bookingReference = "NEST-CDG-HEL-NRT";
      const booking = await authorization(
        request(httpServer(app)).post(`/trips/${tripId}/bookings`),
      )
        .send({
          confirmationNumber: bookingReference,
          details: flightDetails(travelerId, bookingReference),
          providerName: "Finnair",
          status: "confirmed",
          title: "Paris to Tokyo via Helsinki",
          verificationStatus: "verified",
        })
        .expect(201);
      const bookingBody = createBookingResponseSchema.parse(booking.body);
      expect(bookingBody).toMatchObject({
        endIanaZone: "Asia/Tokyo",
        startIanaZone: "Europe/Paris",
        type: "flight",
      });
      expect(bookingBody.details?.type).toBe("flight");
      if (bookingBody.details?.type !== "flight") {
        throw new Error("Expected stored flight details");
      }
      expect(bookingBody.details.segments).toHaveLength(2);

      const readTrip = await authorization(
        request(httpServer(app)).get(`/trips/${tripId}`),
      ).expect(200);
      getTripResponseSchema.parse(readTrip.body);

      const bookings = await authorization(
        request(httpServer(app)).get(`/trips/${tripId}/bookings`),
      ).expect(200);
      const bookingList = listBookingsResponseSchema.parse(bookings.body);
      expect(bookingList.map((record) => record.id)).toContain(bookingBody.id);

      const assignments = await authorization(
        request(httpServer(app)).get(`/bookings/${bookingBody.id}/travelers`),
      ).expect(200);
      const assignmentList = listBookingTravelersResponseSchema.parse(
        assignments.body,
      );
      expect(assignmentList).toEqual([
        expect.objectContaining({
          bookingId: bookingBody.id,
          seat: "12A",
          travelerId,
        }),
      ]);
    });

    it("returns 422 for unresolved IATA and overlapping flight segments", async () => {
      await authorization(request(httpServer(app)).post("/trips"))
        .send({
          destination: { iataCode: "ZZZ", source: "iata" },
          endDate: "2027-05-02",
          startDate: "2027-05-01",
          title: "Unknown destination",
        })
        .expect(422);

      const reference = "NEST-OVERLAP";
      await authorization(
        request(httpServer(app)).post(`/trips/${tripId}/bookings`),
      )
        .send({
          details: flightDetails(travelerId, reference, "2027-04-01T14:00"),
          title: "Overlapping connection",
        })
        .expect(422);
    });

    it("rolls back booking persistence when traveler synchronization fails", async () => {
      const reference = "NEST-ROLLBACK";
      await authorization(
        request(httpServer(app)).post(`/trips/${tripId}/bookings`),
      )
        .send({
          confirmationNumber: reference,
          details: flightDetails(missingTravelerId, reference),
          title: "Must roll back",
        })
        .expect(500);

      const bookings = await authorization(
        request(httpServer(app)).get(`/trips/${tripId}/bookings`),
      ).expect(200);
      const bookingList = listBookingsResponseSchema.parse(bookings.body);
      expect(
        bookingList.some((record) => record.confirmationNumber === reference),
      ).toBe(false);
    });
  },
);
