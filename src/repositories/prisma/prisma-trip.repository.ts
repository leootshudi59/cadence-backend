import { Injectable } from "@nestjs/common";
import { TripStatus as PrismaTripStatus } from "../../generated/prisma";
import type { Trip } from "../../generated/prisma/client";
import type {
  ITripRepository,
  TripPersistenceInput,
  TripUpdatePersistenceInput,
} from "../interfaces/ITripRepository";
import type {
  RlsTransactionClient,
  TripStatusValue,
} from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

/**
 * Maps the application-level trip status values to the corresponding
 * Prisma enum values expected by PostgreSQL.
 */
const PRISMA_TRIP_STATUS: Record<TripStatusValue, PrismaTripStatus> = {
  draft: PrismaTripStatus.DRAFT,
  planned: PrismaTripStatus.PLANNED,
  ongoing: PrismaTripStatus.ONGOING,
  past: PrismaTripStatus.PAST,
  cancelled: PrismaTripStatus.CANCELLED,
};

@Injectable()
export class PrismaTripRepository implements ITripRepository {
  /**
   * Creates a trip and returns the Prisma Trip model directly.
   *
   * The application-level trip status is converted to the corresponding
   * Prisma enum before persistence.
   */
  async create(
    transaction: RlsTransactionClient,
    input: TripPersistenceInput,
  ): Promise<Trip> {
    try {
      return await transaction.trip.create({
        data: {
          ...input,
          status: PRISMA_TRIP_STATUS[input.status],
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  /**
   * Returns every trip visible through the current RLS transaction,
   * ordered chronologically by start date.
   */
  findAll(transaction: RlsTransactionClient): Promise<Trip[]> {
    return transaction.trip.findMany({
      orderBy: {
        startDate: "asc",
      },
    });
  }

  /**
   * Finds a trip by id through the current RLS transaction.
   *
   * @returns The Prisma Trip when found, otherwise null.
   */
  findById(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<Trip | null> {
    return transaction.trip.findUnique({
      where: {
        id: tripId,
      },
    });
  }

  /**
   * Updates the supplied fields of an existing trip.
   *
   * When the trip status is supplied, its application value is converted
   * to the corresponding Prisma enum before persistence.
   *
   * @returns The updated Prisma Trip, or null when no row was updated.
   */
  async update(
    transaction: RlsTransactionClient,
    tripId: string,
    input: TripUpdatePersistenceInput,
  ): Promise<Trip | null> {
    const { status, ...rest } = input;

    try {
      const updated = await transaction.trip.updateMany({
        where: {
          id: tripId,
        },
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

      return transaction.trip.findUnique({
        where: {
          id: tripId,
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  /**
   * Deletes a trip through the current RLS transaction.
   *
   * @returns True when a trip was deleted, otherwise false.
   */
  async delete(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<boolean> {
    const deleted = await transaction.trip.deleteMany({
      where: {
        id: tripId,
      },
    });

    return deleted.count > 0;
  }
}