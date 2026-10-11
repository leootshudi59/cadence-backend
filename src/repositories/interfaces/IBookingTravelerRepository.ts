import type { BookingTraveler } from "../../generated/prisma/client";
import type { RlsTransactionClient } from "../types";

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
  ): Promise<BookingTraveler>;

  findAll(
    transaction: RlsTransactionClient,
    bookingId: string,
  ): Promise<BookingTraveler[]>;

  findById(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<BookingTraveler | null>;

  update(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
    input: BookingTravelerUpdatePersistenceInput,
  ): Promise<BookingTraveler | null>;

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