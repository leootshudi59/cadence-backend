import type { BookingDetailsStored } from "../../dtos/booking";
import type { StoredDate } from "../../domain/time";
import type {
  BookingDetailType,
  BookingRecord,
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
  ): Promise<BookingRecord>;

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<BookingRecord[]>;

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<BookingRecord | null>;

  update(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
    input: BookingUpdatePersistenceInput,
  ): Promise<BookingRecord | null>;

  delete(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<boolean>;
}
