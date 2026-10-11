import type { StoredDate } from "../../domain/time";
import type { Trip } from "../../generated/prisma/client";
import type {
  RlsTransactionClient,
  TripStatusValue,
} from "../types";

export interface TripPersistenceInput {
  baseCurrency: string;
  budgetAmount: string | null;
  budgetCurrency: string | null;
  coverImageUrl: string | null;
  destinationCity: string;
  destinationCountry: string;
  endDate: StoredDate;
  ianaZone: string;
  ownerId: string;
  placeId: string | null;
  startDate: StoredDate;
  status: TripStatusValue;
  title: string;
}

export type TripUpdatePersistenceInput = Partial<
  Omit<TripPersistenceInput, "ownerId">
>;

export interface ITripRepository {
  create(
    transaction: RlsTransactionClient,
    input: TripPersistenceInput,
  ): Promise<Trip>;

  findAll(transaction: RlsTransactionClient): Promise<Trip[]>;

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<Trip | null>;

  update(
    transaction: RlsTransactionClient,
    tripId: string,
    input: TripUpdatePersistenceInput,
  ): Promise<Trip | null>;

  delete(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<boolean>;
}