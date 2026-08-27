import { Injectable } from "@nestjs/common";
import type {
  IProfileRepository,
  PutProfilePersistenceInput,
} from "../interfaces/IProfileRepository";
import type { ProfileRecord, RlsTransactionClient } from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

function toProfileRecord(record: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  homeIanaZone: string;
  baseCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}): ProfileRecord {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    locale: record.locale,
    homeIanaZone: record.homeIanaZone,
    baseCurrency: record.baseCurrency,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class PrismaProfileRepository implements IProfileRepository {
  findById(
    transaction: RlsTransactionClient,
    accountId: string,
  ): Promise<ProfileRecord | null> {
    return transaction.profile
      .findUnique({ where: { id: accountId } })
      .then((record) => (record === null ? null : toProfileRecord(record)));
  }

  async put(
    transaction: RlsTransactionClient,
    input: PutProfilePersistenceInput,
  ): Promise<ProfileRecord> {
    try {
      const record = await transaction.profile.upsert({
        where: { id: input.accountId },
        create: {
          id: input.accountId,
          email: input.email,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          locale: input.locale,
          homeIanaZone: input.homeIanaZone,
          baseCurrency: input.baseCurrency,
        },
        update: {
          email: input.email,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          locale: input.locale,
          homeIanaZone: input.homeIanaZone,
          baseCurrency: input.baseCurrency,
        },
      });
      return toProfileRecord(record);
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }
}
