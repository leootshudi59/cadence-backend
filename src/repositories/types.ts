import type { Prisma } from "../generated/prisma";
import type { BookingDetailsStored } from "../dtos/booking";
import type { StoredDate } from "../domain/time";

export type RlsTransactionClient = Prisma.TransactionClient;
export type RlsOperation<T> = (transaction: RlsTransactionClient) => Promise<T>;

export interface ProfileRecord {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  homeIanaZone: string;
  baseCurrency: string;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export interface TravelerRecord {
  id: string;
  ownerId: string;
  accountId: string | null;
  firstName: string;
  lastName: string;
  birthDate: StoredDate | null;
  nationality: string | null;
  residenceCountry: string | null;
  earliestWakeTime: StoredDate | null;
  latestEndTime: StoredDate | null;
  maxActivitiesPerDay: number | null;
  breakMinutesPerDay: number | null;
  napRequired: boolean;
  napWindowStart: StoredDate | null;
  napWindowEnd: StoredDate | null;
  prefersLocalOverTouristic: boolean;
  notes: string | null;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export type TripStatusValue =
  "draft" | "planned" | "ongoing" | "past" | "cancelled";

export interface TripRecord {
  id: string;
  ownerId: string;
  title: string;
  destinationCity: string;
  destinationCountry: string;
  placeId: string | null;
  ianaZone: string;
  startDate: StoredDate;
  endDate: StoredDate;
  status: TripStatusValue;
  budgetAmount: string | null;
  budgetCurrency: string | null;
  baseCurrency: string;
  coverImageUrl: string | null;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export type InviteStatusValue = "pending" | "accepted" | "declined";
export type ParticipantRoleValue = "owner" | "editor" | "viewer";

export interface ParticipantRecord {
  id: string;
  tripId: string;
  travelerId: string;
  role: ParticipantRoleValue;
  inviteStatus: InviteStatusValue;
  canViewDocuments: boolean;
  invitedAt: StoredDate;
  respondedAt: StoredDate | null;
}

export type BookingDetailType = BookingDetailsStored["type"];
export type BookingStatusValue = "confirmed" | "pending" | "cancelled";
export type VerificationStatusValue = "verified" | "needs-review";

export interface BookingRecord {
  id: string;
  tripId: string;
  type: BookingDetailType;
  title: string;
  providerName: string | null;
  confirmationNumber: string | null;
  status: BookingStatusValue;
  startAt: StoredDate;
  startIanaZone: string;
  startPlaceId: string | null;
  endAt: StoredDate | null;
  endIanaZone: string | null;
  endPlaceId: string | null;
  details: unknown;
  verificationStatus: VerificationStatusValue;
  extractionConfidence: number | null;
  rawIngestionId: string | null;
  createdAt: StoredDate;
  updatedAt: StoredDate;
}

export interface BookingTravelerRecord {
  id: string;
  bookingId: string;
  travelerId: string;
  seat: string | null;
  ticketNumber: string | null;
}

export interface PlaceRecord {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  ianaZone: string;
  iataCode: string | null;
}
