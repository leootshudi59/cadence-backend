import { Injectable } from "@nestjs/common";
import type { BookingTraveler } from "../../generated/prisma/client";
import type {
  BookingTravelerPersistenceInput,
  BookingTravelerUpdatePersistenceInput,
  IBookingTravelerRepository,
  NormalizedBookingTraveler,
} from "../interfaces/IBookingTravelerRepository";
import type { RlsTransactionClient } from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

@Injectable()
export class PrismaBookingTravelerRepository
  implements IBookingTravelerRepository
{
  async create(
    transaction: RlsTransactionClient,
    input: BookingTravelerPersistenceInput,
  ): Promise<BookingTraveler> {
    try {
      return await transaction.bookingTraveler.create({
        data: input,
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  findAll(
    transaction: RlsTransactionClient,
    bookingId: string,
  ): Promise<BookingTraveler[]> {
    return transaction.bookingTraveler.findMany({
      where: { bookingId },
      orderBy: { id: "asc" },
    });
  }

  findById(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<BookingTraveler | null> {
    return transaction.bookingTraveler.findFirst({
      where: {
        id: bookingTravelerId,
        bookingId,
      },
    });
  }

  async update(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
    input: BookingTravelerUpdatePersistenceInput,
  ): Promise<BookingTraveler | null> {
    try {
      const updated = await transaction.bookingTraveler.updateMany({
        where: {
          id: bookingTravelerId,
          bookingId,
        },
        data: input,
      });

      if (updated.count === 0) {
        return null;
      }

      return transaction.bookingTraveler.findFirst({
        where: {
          id: bookingTravelerId,
          bookingId,
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  async delete(
    transaction: RlsTransactionClient,
    bookingId: string,
    bookingTravelerId: string,
  ): Promise<boolean> {
    const deleted = await transaction.bookingTraveler.deleteMany({
      where: {
        id: bookingTravelerId,
        bookingId,
      },
    });

    return deleted.count > 0;
  }

  async syncForBooking(
    transaction: RlsTransactionClient,
    bookingId: string,
    travelers: NormalizedBookingTraveler[],
  ): Promise<void> {
    try {
      await transaction.bookingTraveler.deleteMany({
        where: {
          bookingId,
          travelerId: {
            notIn: travelers.map((traveler) => traveler.travelerId),
          },
        },
      });

      for (const traveler of travelers) {
        await transaction.bookingTraveler.upsert({
          where: {
            bookingId_travelerId: {
              bookingId,
              travelerId: traveler.travelerId,
            },
          },
          create: {
            bookingId,
            travelerId: traveler.travelerId,
            seat: traveler.seat,
          },
          update: {
            seat: traveler.seat,
          },
        });
      }
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }
}