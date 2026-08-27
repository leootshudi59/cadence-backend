import { Global, Module } from "@nestjs/common";
import {
  BOOKING_REPOSITORY,
  BOOKING_TRAVELER_REPOSITORY,
  IDENTITY_REPOSITORY,
  LOCATION_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  PROFILE_REPOSITORY,
  TRAVELER_REPOSITORY,
  TRIP_REPOSITORY,
} from "../constants/repository-tokens.constants";
import { IdentityRepository } from "../repositories/identity.repository";
import { PrismaService } from "../repositories/prisma.service";
import { PrismaBookingTravelerRepository } from "../repositories/prisma/prisma-booking-traveler.repository";
import { PrismaBookingRepository } from "../repositories/prisma/prisma-booking.repository";
import { PrismaLocationRepository } from "../repositories/prisma/prisma-location.repository";
import { PrismaParticipantRepository } from "../repositories/prisma/prisma-participant.repository";
import { PrismaProfileRepository } from "../repositories/prisma/prisma-profile.repository";
import { PrismaTravelerRepository } from "../repositories/prisma/prisma-traveler.repository";
import { PrismaTripRepository } from "../repositories/prisma/prisma-trip.repository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

const repositoryProviders = [
  { provide: PROFILE_REPOSITORY, useClass: PrismaProfileRepository },
  { provide: TRAVELER_REPOSITORY, useClass: PrismaTravelerRepository },
  { provide: TRIP_REPOSITORY, useClass: PrismaTripRepository },
  { provide: PARTICIPANT_REPOSITORY, useClass: PrismaParticipantRepository },
  { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository },
  {
    provide: BOOKING_TRAVELER_REPOSITORY,
    useClass: PrismaBookingTravelerRepository,
  },
  { provide: LOCATION_REPOSITORY, useClass: PrismaLocationRepository },
  { provide: IDENTITY_REPOSITORY, useClass: IdentityRepository },
] as const;

const repositoryTokens = [
  PROFILE_REPOSITORY,
  TRAVELER_REPOSITORY,
  TRIP_REPOSITORY,
  PARTICIPANT_REPOSITORY,
  BOOKING_REPOSITORY,
  BOOKING_TRAVELER_REPOSITORY,
  LOCATION_REPOSITORY,
  IDENTITY_REPOSITORY,
] as const;

@Global()
@Module({
  providers: [PrismaService, RlsUnitOfWork, ...repositoryProviders],
  exports: [PrismaService, RlsUnitOfWork, ...repositoryTokens],
})
export class DatabaseModule {}
