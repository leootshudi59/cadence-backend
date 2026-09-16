import { find } from "geo-tz";
import { IANAZone } from "luxon";

export interface TimezoneResolver {
  resolve(lat: number, lng: number): string;
}

export type CoordinateTimezoneLookup = (
  lat: number,
  lng: number,
) => readonly string[];

export class InvalidCoordinatesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCoordinatesError";
  }
}

export class TimezoneResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimezoneResolutionError";
  }
}

export function assertValidCoordinates(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new InvalidCoordinatesError("Coordinates must be finite numbers");
  }

  if (lat < -90 || lat > 90) {
    throw new InvalidCoordinatesError("Latitude must be between -90 and 90");
  }

  if (lng < -180 || lng > 180) {
    throw new InvalidCoordinatesError("Longitude must be between -180 and 180");
  }
}

export class GeoTzTimezoneResolver implements TimezoneResolver {
  constructor(private readonly lookup: CoordinateTimezoneLookup = find) {}

  resolve(lat: number, lng: number): string {
    assertValidCoordinates(lat, lng);

    const candidates = [...new Set(this.lookup(lat, lng))];

    if (candidates.length === 0) {
      throw new TimezoneResolutionError(
        `No IANA timezone found for coordinates (${lat}, ${lng})`,
      );
    }

    if (candidates.length > 1) {
      throw new TimezoneResolutionError(
        `Multiple IANA timezones found for coordinates (${lat}, ${lng}): ${candidates.join(", ")}`,
      );
    }

    const candidate = candidates[0];
    if (candidate === undefined || !IANAZone.isValidZone(candidate)) {
      throw new TimezoneResolutionError(
        `Invalid IANA timezone returned for coordinates (${lat}, ${lng})`,
      );
    }

    return candidate;
  }
}
