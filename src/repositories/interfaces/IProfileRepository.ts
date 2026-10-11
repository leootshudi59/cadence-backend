import type { Profile } from "../../generated/prisma/client";
import type { RlsTransactionClient } from "../types";

export interface PutProfilePersistenceInput {
  accountId: string;
  avatarUrl: string | null;
  baseCurrency: string;
  displayName: string;
  email: string;
  homeIanaZone: string;
  locale: string;
}

export interface IProfileRepository {
  findById(
    transaction: RlsTransactionClient,
    accountId: string,
  ): Promise<Profile | null>;

  put(
    transaction: RlsTransactionClient,
    input: PutProfilePersistenceInput,
  ): Promise<Profile>;
}
