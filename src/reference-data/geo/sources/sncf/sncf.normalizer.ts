import type { NormalizedPlace } from "../../normalized-place";
import {
  assertValidCoordinates,
  type TimezoneResolver,
} from "../../timezone/timezone-resolver";
import { SncfDataQualityError, type SncfRow } from "./sncf-row";

export const SNCF_DATA_SOURCE_CODE = "SNCF";

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new SncfDataQualityError(`SNCF ${field} must not be blank`);
  }
  return normalized;
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function parseCoordinates(value: string): { lat: number; lng: number } {
  const normalized = requiredText(value, "Position géographique");
  const match = /^\s*([^,]+?)\s*,\s*([^,]+?)\s*$/.exec(normalized);

  if (match === null) {
    throw new SncfDataQualityError(
      'SNCF Position géographique must have the format "latitude, longitude"',
    );
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new SncfDataQualityError(
      "SNCF Position géographique must contain finite numbers",
    );
  }

  assertValidCoordinates(lat, lng);
  return { lat, lng };
}

export function normalizeSncfRow(
  row: SncfRow,
  timezoneResolver: TimezoneResolver,
): NormalizedPlace {
  const name = requiredText(row.Nom_Gare, "Nom_Gare");
  const externalId = requiredText(row.Id_Gare, "Id_Gare");
  const { lat, lng } = parseCoordinates(row["Position géographique"]);

  return {
    name,
    category: "STATION",
    address: null,
    city: null,
    country: "FR",
    lat,
    lng,
    ianaZone: timezoneResolver.resolve(lat, lng),
    iataCode: null,
    source: {
      dataSourceCode: SNCF_DATA_SOURCE_CODE,
      externalId,
      externalCode: nullableText(row.Code_UIC),
      rawData: row.rawData,
    },
  };
}

export function normalizeSncfRows(
  rows: readonly SncfRow[],
  timezoneResolver: TimezoneResolver,
): NormalizedPlace[] {
  return rows.map((row) => normalizeSncfRow(row, timezoneResolver));
}
