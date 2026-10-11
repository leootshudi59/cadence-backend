import type { BookingDetailsStored } from "../../dtos/booking";
import type { StoredDate } from "../../domain/time";
import type { Booking } from "../../generated/prisma/client";
import type {
  BookingDetailType,
  BookingStatusValue,
  RlsTransactionClient,
  VerificationStatusValue,
} from "../types";

export interface BookingPersistenceInput {
  confirmationNumber: string | null;
  details: BookingDetailsStored;
  endAt: StoredDate | null;
  endIanaZone: string | null;
  endPlaceId: string | null;
  extractionConfidence: number | null;
  providerName: string | null;
  rawIngestionId: string | null;
  startAt: StoredDate;
  startIanaZone: string;
  startPlaceId: string | null;
  status: BookingStatusValue;
  title: string;
  tripId: string;
  type: BookingDetailType;
  verificationStatus: VerificationStatusValue;
}

export type BookingUpdatePersistenceInput = Partial<
  Omit<BookingPersistenceInput, "tripId">
>;

export interface IBookingRepository {
  create(
    transaction: RlsTransactionClient,
    input: BookingPersistenceInput,
  ): Promise<Booking>;

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<Booking[]>;

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<Booking | null>;

  update(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
    input: BookingUpdatePersistenceInput,
  ): Promise<Booking | null>;

  delete(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<boolean>;
}