import { Injectable } from "@nestjs/common";
import type { IIdentityRepository } from "./interfaces/IIdentityRepository";
import type { RlsTransactionClient } from "./types";

interface TravelerIdentityRow {
  traveler_profile_id: string | null;
}

@Injectable()
export class IdentityRepository implements IIdentityRepository {
  async findCurrentTravelerProfileId(
    transaction: RlsTransactionClient,
  ): Promise<string | null> {
    const rows = await transaction.$queryRaw<TravelerIdentityRow[]>`
      SELECT private.current_traveler_profile_id() AS traveler_profile_id
    `;

    return rows[0]?.traveler_profile_id ?? null;
  }
}
