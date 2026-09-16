import { z } from "zod";

export const OURAIRPORTS_REQUIRED_HEADERS = [
  "ident",
  "name",
  "latitude_deg",
  "longitude_deg",
  "iso_country",
  "municipality",
  "iata_code",
] as const;

export const ourAirportsRowFieldsSchema = z.object({
  ident: z.string(),
  name: z.string(),
  latitude_deg: z.string(),
  longitude_deg: z.string(),
  iso_country: z.string(),
  municipality: z.string(),
  iata_code: z.string(),
});

export interface OurAirportsRow {
  readonly ident: string;
  readonly name: string;
  readonly latitude_deg: string;
  readonly longitude_deg: string;
  readonly iso_country: string;
  readonly municipality: string;
  readonly iata_code: string;
  readonly rawData: Readonly<Record<string, string>>;
}

export interface OurAirportsIataRow extends OurAirportsRow {
  readonly iata_code: string;
}

export class OurAirportsDataQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OurAirportsDataQualityError";
  }
}

const iataCodeSchema = z.string().regex(/^[A-Z0-9]{3}$/);

export function normalizeOurAirportsIataCode(row: OurAirportsRow): string {
  const iataCode = row.iata_code.trim().toUpperCase();
  const result = iataCodeSchema.safeParse(iataCode);

  if (!result.success) {
    throw new OurAirportsDataQualityError(
      `Malformed non-empty IATA code "${row.iata_code}" for OurAirports record "${row.ident}"`,
    );
  }

  return result.data;
}

export function selectOurAirportsRowsWithIata(
  rows: readonly OurAirportsRow[],
): OurAirportsIataRow[] {
  const rowsWithIata = rows.filter((row) => row.iata_code.trim() !== "");

  return rowsWithIata.map((row) => {
    return { ...row, iata_code: normalizeOurAirportsIataCode(row) };
  });
}
