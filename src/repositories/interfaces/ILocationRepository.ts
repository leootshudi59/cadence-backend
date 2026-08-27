import type { PlaceRecord, RlsTransactionClient } from "../types";

export interface ILocationRepository {
  findByCoordinates(
    transaction: RlsTransactionClient,
    latitude: number,
    longitude: number,
  ): Promise<PlaceRecord | null>;

  findByIataCode(
    transaction: RlsTransactionClient,
    iataCode: string,
  ): Promise<PlaceRecord | null>;
}
