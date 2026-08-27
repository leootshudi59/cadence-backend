import type { RlsTransactionClient } from "../types";

export interface IIdentityRepository {
  findCurrentTravelerProfileId(
    transaction: RlsTransactionClient,
  ): Promise<string | null>;
}
