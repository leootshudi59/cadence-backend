import type { NormalizedPlace } from "../../normalized-place";
import {
  assertValidCoordinates,
  type TimezoneResolver,
} from "../../timezone/timezone-resolver";
import {
  normalizeOurAirportsIataCode,
  OurAirportsDataQualityError,
  selectOurAirportsRowsWithIata,
  type OurAirportsIataRow,
  type OurAirportsRow,
} from "./ourairports-row";

export const OURAIRPORTS_DATA_SOURCE_CODE = "OURAIRPORTS";

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new OurAirportsDataQualityError(
      `OurAirports ${field} must not be blank`,
    );
  }
  return normalized;
}

function coordinate(value: string, field: string): number {
  const normalized = requiredText(value, field);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new OurAirportsDataQualityError(
      `OurAirports ${field} must be a finite number`,
    );
  }

  return parsed;
}

function nullableUppercase(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized.toUpperCase();
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

export function normalizeOurAirportsRow(
  row: OurAirportsIataRow,
  timezoneResolver: TimezoneResolver,
): NormalizedPlace {
  const externalId = requiredText(row.ident, "ident");
  const name = requiredText(row.name, "name");
  const lat = coordinate(row.latitude_deg, "latitude_deg");
  const lng = coordinate(row.longitude_deg, "longitude_deg");
  const iataCode = normalizeOurAirportsIataCode(row);
  assertValidCoordinates(lat, lng);

  return {
    name,
    category: "AIRPORT",
    address: null,
    city: nullableText(row.municipality),
    country: nullableUppercase(row.iso_country),
    lat,
    lng,
    ianaZone: timezoneResolver.resolve(lat, lng),
    iataCode,
    source: {
      dataSourceCode: OURAIRPORTS_DATA_SOURCE_CODE,
      externalId,
      externalCode: iataCode,
      rawData: row.rawData,
    },
  };
}

export function normalizeOurAirportsRows(
  rows: readonly OurAirportsRow[],
  timezoneResolver: TimezoneResolver,
): NormalizedPlace[] {
  return selectOurAirportsRowsWithIata(rows).map((row) =>
    normalizeOurAirportsRow(row, timezoneResolver),
  );
}
