import { Inject, Injectable } from "@nestjs/common";
import type { RequestAuth } from "../auth/types";
import { BOOKING_TRAVELER_REPOSITORY } from "../constants/repository-tokens.constants";
import {
  ConflictError,
  NotFoundError,
  UniqueConstraintViolationError,
} from "../domain/errors";
import type {
  CreateBookingTravelerBody,
  UpdateBookingTravelerBody,
} from "../dtos/booking-traveler";
import type { BookingTraveler } from "../generated/prisma/client";
import type {
  BookingTravelerUpdatePersistenceInput,
  IBookingTravelerRepository,
} from "../repositories/interfaces/IBookingTravelerRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

@Injectable()
export class BookingTravelerService {
  constructor(
    @Inject(BOOKING_TRAVELER_REPOSITORY)
    private readonly bookingTravelerRepository: IBookingTravelerRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) {}

  /**
   * Assigns a traveler to a booking.
   *
   * Optional seat and ticket number values are normalized to null before
   * persistence. The operation runs inside the authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param bookingId Booking identifier.
   * @param input Validated traveler assignment payload.
   * @returns The created Prisma BookingTraveler.
   * @throws ConflictError When the traveler is already assigned to the booking.
   */
  async create(
    auth: RequestAuth,
    bookingId: string,
    input: CreateBookingTravelerBody,
  ): Promise<BookingTraveler> {
    try {
      return await this.rlsUnitOfWork.execute(auth, (transaction) =>
        this.bookingTravelerRepository.create(transaction, {
          bookingId,
          travelerId: input.travelerId,
          seat: input.seat ?? null,
          ticketNumber: input.ticketNumber ?? null,
        }),
      );
    } catch (error) {
      if (error instanceof UniqueConstraintViolationError) {
        throw new ConflictError("Traveler is already assigned to this booking");
      }

      throw error;
    }
  }

  /**
   * Returns all traveler assignments attached to a booking.
   *
   * @param auth Verified authentication context.
   * @param bookingId Booking identifier.
   * @returns Prisma BookingTraveler objects visible through RLS.
   */
  findAll(auth: RequestAuth, bookingId: string): Promise<BookingTraveler[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.bookingTravelerRepository.findAll(transaction, bookingId),
    );
  }

  /**
   * Returns one traveler assignment belonging to a booking.
   *
   * @param auth Verified authentication context.
   * @param bookingId Booking identifier.
   * @param bookingTravelerId Booking traveler assignment identifier.
   * @returns The matching Prisma BookingTraveler.
   * @throws NotFoundError When the assignment does not exist or is not visible.
   */
  findById(
    auth: RequestAuth,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<BookingTraveler> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.bookingTravelerRepository.findById(
        transaction,
        bookingId,
        bookingTravelerId,
      );

      if (traveler === null) {
        throw new NotFoundError("Booking traveler");
      }

      return traveler;
    });
  }

  /**
   * Updates the mutable fields of a traveler assignment.
   *
   * Only values explicitly provided by the API are forwarded to the
   * repository, so omitted properties remain unchanged.
   *
   * @param auth Verified authentication context.
   * @param bookingId Booking identifier.
   * @param bookingTravelerId Booking traveler assignment identifier.
   * @param input Validated partial update payload.
   * @returns The updated Prisma BookingTraveler.
   * @throws NotFoundError When the assignment does not exist or is not visible.
   */
  update(
    auth: RequestAuth,
    bookingId: string,
    bookingTravelerId: string,
    input: UpdateBookingTravelerBody,
  ): Promise<BookingTraveler> {
    const persistenceInput: BookingTravelerUpdatePersistenceInput = {};

    if (input.seat !== undefined) {
      persistenceInput.seat = input.seat;
    }

    if (input.ticketNumber !== undefined) {
      persistenceInput.ticketNumber = input.ticketNumber;
    }

    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.bookingTravelerRepository.update(
        transaction,
        bookingId,
        bookingTravelerId,
        persistenceInput,
      );

      if (traveler === null) {
        throw new NotFoundError("Booking traveler");
      }

      return traveler;
    });
  }

  /**
   * Deletes a traveler assignment from a booking.
   *
   * @param auth Verified authentication context.
   * @param bookingId Booking identifier.
   * @param bookingTravelerId Booking traveler assignment identifier.
   * @throws NotFoundError When no matching assignment could be deleted.
   */
  delete(
    auth: RequestAuth,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const deleted = await this.bookingTravelerRepository.delete(
        transaction,
        bookingId,
        bookingTravelerId,
      );

      if (!deleted) {
        throw new NotFoundError("Booking traveler");
      }
    });
  }
}
