import { Injectable } from "@nestjs/common";
import {
  BookingStatus as PrismaBookingStatus,
  BookingType as PrismaBookingType,
  Prisma,
  VerificationStatus as PrismaVerificationStatus,
} from "../../generated/prisma";
import type { Booking } from "../../generated/prisma/client";
import type {
  BookingPersistenceInput,
  BookingUpdatePersistenceInput,
  IBookingRepository,
} from "../interfaces/IBookingRepository";
import type {
  BookingDetailType,
  BookingStatusValue,
  RlsTransactionClient,
  VerificationStatusValue,
} from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

const PRISMA_BOOKING_TYPE: Record<
  BookingDetailType,
  PrismaBookingType
> = {
  flight: PrismaBookingType.FLIGHT,
  train: PrismaBookingType.TRAIN,
  lodging: PrismaBookingType.ACCOMMODATION,
  activity: PrismaBookingType.ACTIVITY,
  restaurant: PrismaBookingType.RESTAURANT,
  transport: PrismaBookingType.TRANSFER,
};

const PRISMA_BOOKING_STATUS: Record<
  BookingStatusValue,
  PrismaBookingStatus
> = {
  confirmed: PrismaBookingStatus.CONFIRMED,
  pending: PrismaBookingStatus.PENDING,
  cancelled: PrismaBookingStatus.CANCELLED,
};

const PRISMA_VERIFICATION_STATUS: Record<
  VerificationStatusValue,
  PrismaVerificationStatus
> = {
  verified: PrismaVerificationStatus.VERIFIED,
  "needs-review": PrismaVerificationStatus.NEEDS_REVIEW,
};

/**
 * Converts validated booking details into a Prisma-compatible JSON value.
 */
function jsonValue(
  value: BookingPersistenceInput["details"],
): Prisma.InputJsonValue {
  return value;
}

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  async create(
    transaction: RlsTransactionClient,
    input: BookingPersistenceInput,
  ): Promise<Booking> {
    try {
      return await transaction.booking.create({
        data: {
          tripId: input.tripId,
          type: PRISMA_BOOKING_TYPE[input.type],
          title: input.title,
          providerName: input.providerName,
          confirmationNumber: input.confirmationNumber,
          status: PRISMA_BOOKING_STATUS[input.status],
          startAt: input.startAt,
          startIanaZone: input.startIanaZone,
          startPlaceId: input.startPlaceId,
          endAt: input.endAt,
          endIanaZone: input.endIanaZone,
          endPlaceId: input.endPlaceId,
          details: jsonValue(input.details),
          verificationStatus:
            PRISMA_VERIFICATION_STATUS[input.verificationStatus],
          extractionConfidence: input.extractionConfidence,
          rawIngestionId: input.rawIngestionId,
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<Booking[]> {
    return transaction.booking.findMany({
      where: { tripId },
      orderBy: { startAt: "asc" },
    });
  }

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<Booking | null> {
    return transaction.booking.findFirst({
      where: {
        id: bookingId,
        tripId,
      },
    });
  }

  async update(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
    input: BookingUpdatePersistenceInput,
  ): Promise<Booking | null> {
    const {
      details,
      status,
      type,
      verificationStatus,
      ...rest
    } = input;

    try {
      const updated = await transaction.booking.updateMany({
        where: {
          id: bookingId,
          tripId,
        },
        data: {
          ...rest,

          ...(details === undefined
            ? {}
            : {
                details: jsonValue(details),
              }),

          ...(status === undefined
            ? {}
            : {
                status: PRISMA_BOOKING_STATUS[status],
              }),

          ...(type === undefined
            ? {}
            : {
                type: PRISMA_BOOKING_TYPE[type],
              }),

          ...(verificationStatus === undefined
            ? {}
            : {
                verificationStatus:
                  PRISMA_VERIFICATION_STATUS[verificationStatus],
              }),
        },
      });

      if (updated.count === 0) {
        return null;
      }

      return transaction.booking.findFirst({
        where: {
          id: bookingId,
          tripId,
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  async delete(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<boolean> {
    const deleted = await transaction.booking.deleteMany({
      where: {
        id: bookingId,
        tripId,
      },
    });

    return deleted.count > 0;
  }
}