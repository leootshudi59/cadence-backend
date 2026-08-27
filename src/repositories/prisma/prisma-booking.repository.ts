import { Injectable } from "@nestjs/common";
import {
  BookingStatus as PrismaBookingStatus,
  BookingType as PrismaBookingType,
  Prisma,
  VerificationStatus as PrismaVerificationStatus,
  type Booking as PrismaBooking,
} from "../../generated/prisma";
import type {
  BookingPersistenceInput,
  BookingUpdatePersistenceInput,
  IBookingRepository,
} from "../interfaces/IBookingRepository";
import type {
  BookingDetailType,
  BookingRecord,
  BookingStatusValue,
  RlsTransactionClient,
  VerificationStatusValue,
} from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

const PRISMA_BOOKING_TYPE: Record<BookingDetailType, PrismaBookingType> = {
  flight: PrismaBookingType.FLIGHT,
  train: PrismaBookingType.TRAIN,
  lodging: PrismaBookingType.ACCOMMODATION,
  activity: PrismaBookingType.ACTIVITY,
  restaurant: PrismaBookingType.RESTAURANT,
  transport: PrismaBookingType.TRANSFER,
};

const PRISMA_BOOKING_STATUS: Record<BookingStatusValue, PrismaBookingStatus> = {
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

const BOOKING_TYPE: Record<PrismaBookingType, BookingDetailType> = {
  FLIGHT: "flight",
  TRAIN: "train",
  BUS: "transport",
  FERRY: "transport",
  CAR_RENTAL: "transport",
  TRANSFER: "transport",
  ACCOMMODATION: "lodging",
  RESTAURANT: "restaurant",
  ACTIVITY: "activity",
  OTHER: "transport",
};

const BOOKING_STATUS: Record<PrismaBookingStatus, BookingStatusValue> = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  CANCELLED: "cancelled",
};

const VERIFICATION_STATUS: Record<
  PrismaVerificationStatus,
  VerificationStatusValue
> = {
  VERIFIED: "verified",
  NEEDS_REVIEW: "needs-review",
};

function toBookingRecord(record: PrismaBooking | null): BookingRecord | null {
  if (record === null) return null;
  return {
    ...record,
    type: BOOKING_TYPE[record.type],
    status: BOOKING_STATUS[record.status],
    verificationStatus: VERIFICATION_STATUS[record.verificationStatus],
    extractionConfidence: record.extractionConfidence?.toNumber() ?? null,
  };
}

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
  ): Promise<BookingRecord> {
    try {
      const record = await transaction.booking.create({
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
      return toBookingRecord(record)!;
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<BookingRecord[]> {
    return transaction.booking
      .findMany({
        where: { tripId },
        orderBy: { startAt: "asc" },
      })
      .then((records) => records.map((record) => toBookingRecord(record)!));
  }

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<BookingRecord | null> {
    return transaction.booking
      .findFirst({ where: { id: bookingId, tripId } })
      .then(toBookingRecord);
  }

  async update(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
    input: BookingUpdatePersistenceInput,
  ): Promise<BookingRecord | null> {
    const { details, status, type, verificationStatus, ...rest } = input;

    try {
      const updated = await transaction.booking.updateMany({
        where: { id: bookingId, tripId },
        data: {
          ...rest,
          ...(details === undefined ? {} : { details: jsonValue(details) }),
          ...(status === undefined
            ? {}
            : { status: PRISMA_BOOKING_STATUS[status] }),
          ...(type === undefined ? {} : { type: PRISMA_BOOKING_TYPE[type] }),
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
      return transaction.booking
        .findFirst({ where: { id: bookingId, tripId } })
        .then(toBookingRecord);
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
      where: { id: bookingId, tripId },
    });
    return deleted.count > 0;
  }
}
