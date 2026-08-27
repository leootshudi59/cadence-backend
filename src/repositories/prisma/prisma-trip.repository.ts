import { Injectable } from "@nestjs/common";
import {
  TripStatus as PrismaTripStatus,
  type Trip as PrismaTrip,
} from "../../generated/prisma";
import type {
  ITripRepository,
  TripPersistenceInput,
  TripUpdatePersistenceInput,
} from "../interfaces/ITripRepository";
import type {
  RlsTransactionClient,
  TripRecord,
  TripStatusValue,
} from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

const PRISMA_TRIP_STATUS: Record<TripStatusValue, PrismaTripStatus> = {
  draft: PrismaTripStatus.DRAFT,
  planned: PrismaTripStatus.PLANNED,
  ongoing: PrismaTripStatus.ONGOING,
  past: PrismaTripStatus.PAST,
  cancelled: PrismaTripStatus.CANCELLED,
};

const TRIP_STATUS: Record<PrismaTripStatus, TripStatusValue> = {
  DRAFT: "draft",
  PLANNED: "planned",
  ONGOING: "ongoing",
  PAST: "past",
  CANCELLED: "cancelled",
};

function toTripRecord(record: PrismaTrip | null): TripRecord | null {
  if (record === null) return null;
  return {
    ...record,
    status: TRIP_STATUS[record.status],
    budgetAmount: record.budgetAmount?.toString() ?? null,
  };
}

@Injectable()
export class PrismaTripRepository implements ITripRepository {
  async create(
    transaction: RlsTransactionClient,
    input: TripPersistenceInput,
  ): Promise<TripRecord> {
    try {
      const record = await transaction.trip.create({
        data: { ...input, status: PRISMA_TRIP_STATUS[input.status] },
      });
      return toTripRecord(record)!;
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  findAll(transaction: RlsTransactionClient): Promise<TripRecord[]> {
    return transaction.trip
      .findMany({ orderBy: { startDate: "asc" } })
      .then((records) => records.map((record) => toTripRecord(record)!));
  }

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<TripRecord | null> {
    return transaction.trip
      .findUnique({ where: { id: tripId } })
      .then(toTripRecord);
  }

  async update(
    transaction: RlsTransactionClient,
    tripId: string,
    input: TripUpdatePersistenceInput,
  ): Promise<TripRecord | null> {
    const { status, ...rest } = input;

    try {
      const updated = await transaction.trip.updateMany({
        where: { id: tripId },
        data: {
          ...rest,
          ...(status === undefined
            ? {}
            : { status: PRISMA_TRIP_STATUS[status] }),
        },
      });
      if (updated.count === 0) {
        return null;
      }
      return transaction.trip
        .findUnique({ where: { id: tripId } })
        .then(toTripRecord);
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  async delete(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<boolean> {
    const deleted = await transaction.trip.deleteMany({
      where: { id: tripId },
    });
    return deleted.count > 0;
  }
}
