import type { BookingTravelerRecord, RlsTransactionClient } from "../types";

export interface BookingTravelerPersistenceInput {
  bookingId: string;
  seat: string | null;
  ticketNumber: string | null;
  travelerId: string;
}

export interface NormalizedBookingTraveler {
  seat: string | null;
  travelerId: string;
}

export type BookingTravelerUpdatePersistenceInput = Partial<
  Pick<BookingTravelerPersistenceInput, "seat" | "ticketNumber">
>;

export interface IBookingTravelerRepository {
  create(
    transaction: RlsTransactionClient,
    input: BookingTravelerPersistenceInput,
  ): Promise<BookingTravelerRecord>;

  findAll(
    transaction: RlsTransactionClient,
    bookingId: string,
  ): Promise<BookingTravelerRecord[]>;

  findById(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<BookingTravelerRecord | null>;

  update(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
    input: BookingTravelerUpdatePersistenceInput,
  ): Promise<BookingTravelerRecord | null>;

  delete(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<boolean>;

  syncForBooking(
    transaction: RlsTransactionClient,
    bookingId: string,
    travelers: NormalizedBookingTraveler[],
  ): Promise<void>;
}
