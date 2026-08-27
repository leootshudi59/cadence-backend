import type { ProfileRecord, RlsTransactionClient } from "../types";

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
  ): Promise<ProfileRecord | null>;

  put(
    transaction: RlsTransactionClient,
    input: PutProfilePersistenceInput,
  ): Promise<ProfileRecord>;
}
