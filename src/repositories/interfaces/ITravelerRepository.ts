import type { TravelerProfile } from "../../generated/prisma/client";
import type { StoredDate } from "../../domain/time";
import type { RlsTransactionClient } from "../types";

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
  ): Promise<TravelerProfile>;

  findAll(
    transaction: RlsTransactionClient,
  ): Promise<TravelerProfile[]>;

  findById(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<TravelerProfile | null>;

  update(
    transaction: RlsTransactionClient,
    travelerId: string,
    input: TravelerUpdatePersistenceInput,
  ): Promise<TravelerProfile | null>;

  delete(
    transaction: RlsTransactionClient,
    travelerId: string,
  ): Promise<boolean>;
}