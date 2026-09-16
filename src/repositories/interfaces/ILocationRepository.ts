import type { Place } from "../../generated/prisma/client";
import type { RlsTransactionClient } from "../types";

export interface ILocationRepository {
  findByCoordinates(
    transaction: RlsTransactionClient,
    latitude: number,
    longitude: number,
  ): Promise<Place | null>;

  findByIataCode(
    transaction: RlsTransactionClient,
    iataCode: string,
  ): Promise<Place | null>;
}