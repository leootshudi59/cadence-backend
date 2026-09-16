import { Injectable } from "@nestjs/common";
import type { Profile } from "../../generated/prisma/client";
import type {
  IProfileRepository,
  PutProfilePersistenceInput,
} from "../interfaces/IProfileRepository";
import type { RlsTransactionClient } from "../types";
import { rethrowPersistenceError } from "./prisma-errors";


@Injectable()
export class PrismaProfileRepository implements IProfileRepository {
  findById(
    transaction: RlsTransactionClient,
    accountId: string,
  ): Promise<Profile | null> {
    return transaction.profile.findUnique({ where: { id: accountId } })
  }

  async put(
    transaction: RlsTransactionClient,
    input: PutProfilePersistenceInput,
  ): Promise<Profile> {
    try {
      return await transaction.profile.upsert({
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
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }
}
