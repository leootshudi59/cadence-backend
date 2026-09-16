import { Injectable } from "@nestjs/common";
import type { TravelerProfile } from "../../generated/prisma/client";
import type {
  ITravelerRepository,
  TravelerPersistenceInput,
  TravelerUpdatePersistenceInput,
} from "../interfaces/ITravelerRepository";
import type { RlsTransactionClient } from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

@Injectable()
export class PrismaTravelerRepository implements ITravelerRepository {
  /**
   * Creates a traveler profile and returns the Prisma model directly.
   */
  async create(
    transaction: RlsTransactionClient,
    input: TravelerPersistenceInput,
  ): Promise<TravelerProfile> {
    try {
      return await transaction.travelerProfile.create({
        data: input,
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  /**
   * Returns every traveler profile visible through the current RLS transaction.
   */
  findAll(
    transaction: RlsTransactionClient,
  ): Promise<TravelerProfile[]> {
    return transaction.travelerProfile.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }

  /**
   * Finds a traveler profile by id.
   *
   * Returns null when the traveler does not exist or is not visible
   * through the current RLS transaction.
   */
  findById(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<TravelerProfile | null> {
    return transaction.travelerProfile.findUnique({
      where: { id: travelerId },
    });
  }

  /**
   * Updates the mutable fields of a traveler profile.
   *
   * updateMany is intentionally used so a missing or RLS-inaccessible row
   * can be represented as null instead of relying on a Prisma not-found error.
   */
  async update(
    transaction: RlsTransactionClient,
    travelerId: string,
    input: TravelerUpdatePersistenceInput,
  ): Promise<TravelerProfile | null> {
    try {
      const updated = await transaction.travelerProfile.updateMany({
        where: { id: travelerId },
        data: input,
      });

      if (updated.count === 0) {
        return null;
      }

      return transaction.travelerProfile.findUnique({
        where: { id: travelerId },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  /**
   * Deletes a traveler profile.
   *
   * Returns true when a row was deleted, otherwise false.
   */
  async delete(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<boolean> {
    const deleted = await transaction.travelerProfile.deleteMany({
      where: { id: travelerId },
    });

    return deleted.count > 0;
  }
}