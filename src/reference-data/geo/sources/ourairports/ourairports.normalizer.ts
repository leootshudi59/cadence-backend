import { IANAZone } from "luxon";
import type { NormalizedPlace } from "../../normalized-place";
import {
  AmbiguousTimezoneError,
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

export interface OurAirportsTimezoneOverrides {
  readonly byIdent: Readonly<Record<string, string>>;
  readonly byIata: Readonly<Record<string, string>>;
}

export interface RejectedOurAirportsRow {
  readonly externalId: string;
  readonly iataCode: string;
  readonly candidates: readonly string[];
}

export interface OurAirportsNormalizationReport {
  readonly eligible: number;
  readonly normalized: readonly NormalizedPlace[];
  readonly rejected: readonly RejectedOurAirportsRow[];
}

const verifiedTimezoneOverrides: OurAirportsTimezoneOverrides = {
  byIdent: {},
  byIata: {},
};

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
  timezoneOverrides: OurAirportsTimezoneOverrides = verifiedTimezoneOverrides,
): NormalizedPlace {
  const externalId = requiredText(row.ident, "ident");
  const name = requiredText(row.name, "name");
  const lat = coordinate(row.latitude_deg, "latitude_deg");
  const lng = coordinate(row.longitude_deg, "longitude_deg");
  const iataCode = normalizeOurAirportsIataCode(row);
  assertValidCoordinates(lat, lng);

  let ianaZone: string;
  try {
    ianaZone = timezoneResolver.resolve(lat, lng);
  } catch (error) {
    if (!(error instanceof AmbiguousTimezoneError)) {
      throw error;
    }

    const override =
      timezoneOverrides.byIdent[externalId] ??
      timezoneOverrides.byIata[iataCode];
    if (override === undefined) {
      throw error;
    }
    if (
      !error.candidates.includes(override) ||
      !IANAZone.isValidZone(override)
    ) {
      throw new OurAirportsDataQualityError(
        `Invalid verified timezone override for OurAirports record "${externalId}"`,
      );
    }
    ianaZone = override;
  }

  return {
    name,
    category: "AIRPORT",
    address: null,
    city: nullableText(row.municipality),
    country: nullableUppercase(row.iso_country),
    lat,
    lng,
    ianaZone,
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

export function normalizeOurAirportsRowsWithRejections(
  rows: readonly OurAirportsRow[],
  timezoneResolver: TimezoneResolver,
  timezoneOverrides: OurAirportsTimezoneOverrides = verifiedTimezoneOverrides,
): OurAirportsNormalizationReport {
  const eligibleRows = selectOurAirportsRowsWithIata(rows);
  const normalized: NormalizedPlace[] = [];
  const rejected: RejectedOurAirportsRow[] = [];

  for (const row of eligibleRows) {
    try {
      normalized.push(
        normalizeOurAirportsRow(row, timezoneResolver, timezoneOverrides),
      );
    } catch (error) {
      if (!(error instanceof AmbiguousTimezoneError)) {
        throw error;
      }
      rejected.push({
        externalId: row.ident.trim(),
        iataCode: row.iata_code,
        candidates: error.candidates,
      });
    }
  }

  return { eligible: eligibleRows.length, normalized, rejected };
}
