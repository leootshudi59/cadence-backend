import {
  storedDateToDateOnly,
  storedDateToTimeOnly,
  storedDateToUtcIso,
} from "../domain/time";
import {
  bookingDetailsStoredSchema,
  type BookingResponse,
} from "../dtos/booking";
import type { BookingTravelerResponse } from "../dtos/booking-traveler";
import type { ParticipantResponse } from "../dtos/participant";
import type { ProfileResponse } from "../dtos/profile";
import type { TravelerResponse } from "../dtos/traveler";
import type { TripResponse } from "../dtos/trip";
import type {
  BookingRecord,
  BookingTravelerRecord,
  ParticipantRecord,
  ProfileRecord,
  TravelerRecord,
  TripRecord,
} from "../repositories/types";

export function profileResponse(record: ProfileRecord): ProfileResponse {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    locale: record.locale,
    homeIanaZone: record.homeIanaZone,
    baseCurrency: record.baseCurrency,
    createdAt: storedDateToUtcIso(record.createdAt),
    updatedAt: storedDateToUtcIso(record.updatedAt),
  };
}

export function travelerResponse(record: TravelerRecord): TravelerResponse {
  return {
    id: record.id,
    ownerId: record.ownerId,
    accountId: record.accountId,
    firstName: record.firstName,
    lastName: record.lastName,
    birthDate:
      record.birthDate === null ? null : storedDateToDateOnly(record.birthDate),
    nationality: record.nationality,
    residenceCountry: record.residenceCountry,
    earliestWakeTime:
      record.earliestWakeTime === null
        ? null
        : storedDateToTimeOnly(record.earliestWakeTime),
    latestEndTime:
      record.latestEndTime === null
        ? null
        : storedDateToTimeOnly(record.latestEndTime),
    maxActivitiesPerDay: record.maxActivitiesPerDay,
    breakMinutesPerDay: record.breakMinutesPerDay,
    napRequired: record.napRequired,
    napWindowStart:
      record.napWindowStart === null
        ? null
        : storedDateToTimeOnly(record.napWindowStart),
    napWindowEnd:
      record.napWindowEnd === null
        ? null
        : storedDateToTimeOnly(record.napWindowEnd),
    prefersLocalOverTouristic: record.prefersLocalOverTouristic,
    notes: record.notes,
    createdAt: storedDateToUtcIso(record.createdAt),
    updatedAt: storedDateToUtcIso(record.updatedAt),
  };
}

export function tripResponse(record: TripRecord): TripResponse {
  return {
    id: record.id,
    ownerId: record.ownerId,
    title: record.title,
    destinationCity: record.destinationCity,
    destinationCountry: record.destinationCountry,
    placeId: record.placeId,
    ianaZone: record.ianaZone,
    startDate: storedDateToDateOnly(record.startDate),
    endDate: storedDateToDateOnly(record.endDate),
    status: record.status,
    budgetAmount: record.budgetAmount,
    budgetCurrency: record.budgetCurrency,
    baseCurrency: record.baseCurrency,
    coverImageUrl: record.coverImageUrl,
    createdAt: storedDateToUtcIso(record.createdAt),
    updatedAt: storedDateToUtcIso(record.updatedAt),
  };
}

export function participantResponse(
  record: ParticipantRecord,
): ParticipantResponse {
  return {
    id: record.id,
    tripId: record.tripId,
    travelerId: record.travelerId,
    role: record.role,
    inviteStatus: record.inviteStatus,
    canViewDocuments: record.canViewDocuments,
    invitedAt: storedDateToUtcIso(record.invitedAt),
    respondedAt:
      record.respondedAt === null
        ? null
        : storedDateToUtcIso(record.respondedAt),
  };
}

export function bookingResponse(record: BookingRecord): BookingResponse {
  const details = bookingDetailsStoredSchema.safeParse(record.details);
  return {
    id: record.id,
    tripId: record.tripId,
    type: record.type,
    title: record.title,
    providerName: record.providerName,
    confirmationNumber: record.confirmationNumber,
    status: record.status,
    startAt: storedDateToUtcIso(record.startAt),
    startIanaZone: record.startIanaZone,
    startPlaceId: record.startPlaceId,
    endAt: record.endAt === null ? null : storedDateToUtcIso(record.endAt),
    endIanaZone: record.endIanaZone,
    endPlaceId: record.endPlaceId,
    details:
      details.success && details.data.type === record.type
        ? details.data
        : null,
    verificationStatus: record.verificationStatus,
    extractionConfidence: record.extractionConfidence,
    rawIngestionId: record.rawIngestionId,
    createdAt: storedDateToUtcIso(record.createdAt),
    updatedAt: storedDateToUtcIso(record.updatedAt),
  };
}

export function bookingTravelerResponse(
  record: BookingTravelerRecord,
): BookingTravelerResponse {
  return {
    id: record.id,
    bookingId: record.bookingId,
    travelerId: record.travelerId,
    seat: record.seat,
    ticketNumber: record.ticketNumber,
  };
}
