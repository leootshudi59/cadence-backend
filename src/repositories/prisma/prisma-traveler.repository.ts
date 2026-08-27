import { Injectable } from "@nestjs/common";
import type {
  ITravelerRepository,
  TravelerPersistenceInput,
  TravelerUpdatePersistenceInput,
} from "../interfaces/ITravelerRepository";
import type { RlsTransactionClient, TravelerRecord } from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

@Injectable()
export class PrismaTravelerRepository implements ITravelerRepository {
  async create(
    transaction: RlsTransactionClient,
    input: TravelerPersistenceInput,
  ): Promise<TravelerRecord> {
    try {
      return await transaction.travelerProfile.create({ data: input });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  findAll(transaction: RlsTransactionClient): Promise<TravelerRecord[]> {
    return transaction.travelerProfile.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }

  findById(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<TravelerRecord | null> {
    return transaction.travelerProfile.findUnique({
      where: { id: travelerId },
    });
  }

  async update(
    transaction: RlsTransactionClient,
    travelerId: string,
    input: TravelerUpdatePersistenceInput,
  ): Promise<TravelerRecord | null> {
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
