import { Injectable } from "@nestjs/common";
import type { ILocationRepository } from "../interfaces/ILocationRepository";
import type { PlaceRecord, RlsTransactionClient } from "../types";

const selectPlaceRecord = {
  id: true,
  name: true,
  city: true,
  country: true,
  ianaZone: true,
  iataCode: true,
} as const;

@Injectable()
export class PrismaLocationRepository implements ILocationRepository {
  findByCoordinates(
    transaction: RlsTransactionClient,
    latitude: number,
    longitude: number,
  ): Promise<PlaceRecord | null> {
    return transaction.place.findFirst({
      where: { lat: latitude, lng: longitude },
      orderBy: { updatedAt: "desc" },
      select: selectPlaceRecord,
    });
  }

  findByIataCode(
    transaction: RlsTransactionClient,
    iataCode: string,
  ): Promise<PlaceRecord | null> {
    return transaction.place.findFirst({
      where: { iataCode },
      orderBy: { updatedAt: "desc" },
      select: selectPlaceRecord,
    });
  }
}
