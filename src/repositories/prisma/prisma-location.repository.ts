import { Injectable } from "@nestjs/common";
import type { Place } from "../../generated/prisma/client";
import type { ILocationRepository } from "../interfaces/ILocationRepository";
import type { RlsTransactionClient } from "../types";

@Injectable()
export class PrismaLocationRepository implements ILocationRepository {
  findByCoordinates(
    transaction: RlsTransactionClient,
    latitude: number,
    longitude: number,
  ): Promise<Place | null> {
    return transaction.place.findFirst({
      where: {
        lat: latitude,
        lng: longitude,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  findByIataCode(
    transaction: RlsTransactionClient,
    iataCode: string,
  ): Promise<Place | null> {
    return transaction.place.findFirst({
      where: {
        iataCode,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
}