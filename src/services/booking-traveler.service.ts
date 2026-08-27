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
import type {
  BookingTravelerUpdatePersistenceInput,
  IBookingTravelerRepository,
} from "../repositories/interfaces/IBookingTravelerRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import type { BookingTravelerRecord } from "../repositories/types";

@Injectable()
export class BookingTravelerService {
  constructor(
    @Inject(BOOKING_TRAVELER_REPOSITORY)
    private readonly bookingTravelerRepository: IBookingTravelerRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) {}

  async create(
    auth: RequestAuth,
    bookingId: string,
    input: CreateBookingTravelerBody,
  ): Promise<BookingTravelerRecord> {
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

  findAll(
    auth: RequestAuth,
    bookingId: string,
  ): Promise<BookingTravelerRecord[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.bookingTravelerRepository.findAll(transaction, bookingId),
    );
  }

  findById(
    auth: RequestAuth,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<BookingTravelerRecord> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.bookingTravelerRepository.findById(
        transaction,
        bookingId,
        bookingTravelerId,
      );
      if (traveler === null) throw new NotFoundError("Booking traveler");
      return traveler;
    });
  }

  update(
    auth: RequestAuth,
    bookingId: string,
    bookingTravelerId: string,
    input: UpdateBookingTravelerBody,
  ): Promise<BookingTravelerRecord> {
    const record: BookingTravelerUpdatePersistenceInput = {};
    if (input.seat !== undefined) record.seat = input.seat;
    if (input.ticketNumber !== undefined) {
      record.ticketNumber = input.ticketNumber;
    }

    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.bookingTravelerRepository.update(
        transaction,
        bookingId,
        bookingTravelerId,
        record,
      );
      if (traveler === null) throw new NotFoundError("Booking traveler");
      return traveler;
    });
  }

  delete(
    auth: RequestAuth,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      if (
        !(await this.bookingTravelerRepository.delete(
          transaction,
          bookingId,
          bookingTravelerId,
        ))
      ) {
        throw new NotFoundError("Booking traveler");
      }
    });
  }
}
