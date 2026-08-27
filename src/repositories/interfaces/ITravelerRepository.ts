import type { StoredDate } from "../../domain/time";
import type { RlsTransactionClient, TravelerRecord } from "../types";

export interface TravelerPersistenceInput {
  accountId?: string | null;
  birthDate?: StoredDate | null;
  breakMinutesPerDay?: number | null;
  earliestWakeTime?: StoredDate | null;
  firstName: string;
  lastName: string;
  latestEndTime?: StoredDate | null;
  maxActivitiesPerDay?: number | null;
  napRequired?: boolean;
  napWindowEnd?: StoredDate | null;
  napWindowStart?: StoredDate | null;
  nationality?: string | null;
  notes?: string | null;
  ownerId: string;
  prefersLocalOverTouristic?: boolean;
  residenceCountry?: string | null;
}

export type TravelerUpdatePersistenceInput = Omit<
  Partial<TravelerPersistenceInput>,
  "accountId" | "ownerId"
>;

export interface ITravelerRepository {
  create(
    transaction: RlsTransactionClient,
    input: TravelerPersistenceInput,
  ): Promise<TravelerRecord>;

  findAll(transaction: RlsTransactionClient): Promise<TravelerRecord[]>;

  findById(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<TravelerRecord | null>;

  update(
    transaction: RlsTransactionClient,
    travelerId: string,
    input: TravelerUpdatePersistenceInput,
  ): Promise<TravelerRecord | null>;

  delete(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<boolean>;
}
