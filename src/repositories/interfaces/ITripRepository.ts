import type { StoredDate } from "../../domain/time";
import type {
  RlsTransactionClient,
  TripRecord,
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
  ): Promise<TripRecord>;

  findAll(transaction: RlsTransactionClient): Promise<TripRecord[]>;

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<TripRecord | null>;

  update(
    transaction: RlsTransactionClient,
    tripId: string,
    input: TripUpdatePersistenceInput,
  ): Promise<TripRecord | null>;

  delete(transaction: RlsTransactionClient, tripId: string): Promise<boolean>;
}
