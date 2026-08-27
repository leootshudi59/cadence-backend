import { Inject, Injectable } from "@nestjs/common";
import {
  AIRPORTS_BY_IATA,
  isKnownIataCode,
} from "../constants/location.constants";
import { LOCATION_REPOSITORY } from "../constants/repository-tokens.constants";
import { UnresolvedTimezoneError } from "../domain/errors";
import { assertIanaZone } from "../domain/time";
import type { LocationLocator } from "../dtos/location";
import type { ILocationRepository } from "../repositories/interfaces/ILocationRepository";
import type { PlaceRecord, RlsTransactionClient } from "../repositories/types";

export interface ResolvedLocation {
  city: string;
  country: string;
  ianaZone: string;
  iataCode: string | null;
  name: string;
  placeId: string | null;
}

function fromPlace(place: PlaceRecord): ResolvedLocation {
  if (place.city === null || place.country === null) {
    throw new UnresolvedTimezoneError(
      "The resolved place is missing a city or country",
    );
  }

  try {
    assertIanaZone(place.ianaZone);
  } catch {
    throw new UnresolvedTimezoneError(
      "The resolved place has an invalid IANA zone",
    );
  }

  return {
    city: place.city,
    country: place.country,
    ianaZone: place.ianaZone,
    iataCode: place.iataCode,
    name: place.name,
    placeId: place.id,
  };
}

@Injectable()
export class LocationService {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: ILocationRepository,
  ) {}

  async resolve(
    transaction: RlsTransactionClient,
    locator: LocationLocator,
  ): Promise<ResolvedLocation> {
    if (locator.source === "coordinates") {
      const place = await this.locationRepository.findByCoordinates(
        transaction,
        locator.latitude,
        locator.longitude,
      );
      if (place === null) {
        throw new UnresolvedTimezoneError(
          "No authoritative IANA zone exists for these coordinates",
        );
      }
      return fromPlace(place);
    }

    const databasePlace = await this.locationRepository.findByIataCode(
      transaction,
      locator.iataCode,
    );
    if (databasePlace !== null) return fromPlace(databasePlace);

    if (!isKnownIataCode(locator.iataCode)) {
      throw new UnresolvedTimezoneError(
        `No authoritative IANA zone exists for IATA code ${locator.iataCode}`,
      );
    }

    const airport = AIRPORTS_BY_IATA[locator.iataCode];
    assertIanaZone(airport.ianaZone);
    return {
      ...airport,
      iataCode: locator.iataCode,
      placeId: null,
    };
  }
}
