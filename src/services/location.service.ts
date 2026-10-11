import { Inject, Injectable } from "@nestjs/common";
import {
  AIRPORTS_BY_IATA,
  isKnownIataCode,
} from "../constants/location.constants";
import { LOCATION_REPOSITORY } from "../constants/repository-tokens.constants";
import { UnresolvedTimezoneError } from "../domain/errors";
import { assertIanaZone } from "../domain/time";
import type { LocationLocator } from "../dtos/location";
import type { Place } from "../generated/prisma/client";
import type { ILocationRepository } from "../repositories/interfaces/ILocationRepository";
import type { RlsTransactionClient } from "../repositories/types";

export interface ResolvedLocation {
  city: string;
  country: string;
  ianaZone: string;
  iataCode: string | null;
  name: string;
  placeId: string | null;
}

/**
 * Converts a Prisma Place into the location representation used by
 * application services.
 *
 * A resolved location must have a city, country and valid IANA timezone.
 * Database places missing one of these authoritative values cannot be used.
 *
 * @param place Prisma Place returned by the location repository.
 * @returns The validated application-level resolved location.
 * @throws UnresolvedTimezoneError When required geographic data is missing
 * or the stored IANA timezone is invalid.
 */
function toResolvedLocation(place: Place): ResolvedLocation {
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

  /**
   * Resolves a location from coordinates or an IATA airport code.
   *
   * Database places are preferred because they provide a canonical Place id.
   * IATA resolution temporarily falls back to AIRPORTS_BY_IATA when the
   * airport has not yet been imported into the places table.
   *
   * @param transaction Current authenticated RLS transaction.
   * @param locator Coordinates or IATA code identifying the location.
   * @returns A validated resolved location.
   * @throws UnresolvedTimezoneError When no authoritative timezone can
   * be resolved for the supplied locator.
   */
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

      return toResolvedLocation(place);
    }

    const databasePlace = await this.locationRepository.findByIataCode(
      transaction,
      locator.iataCode,
    );

    if (databasePlace !== null) {
      return toResolvedLocation(databasePlace);
    }

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