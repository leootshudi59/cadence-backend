import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  OURAIRPORTS_REQUIRED_HEADERS,
  type OurAirportsRow,
  ourAirportsRowFieldsSchema,
} from "./ourairports-row";

const rawDataSchema = z.record(z.string(), z.string());

export class OurAirportsCsvContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OurAirportsCsvContractError";
  }
}

export function parseOurAirportsCsv(csv: string): OurAirportsRow[] {
  let headerRead = false;

  const records = parse(csv, {
    bom: true,
    columns: (headers: string[]) => {
      headerRead = true;
      const missingHeaders = OURAIRPORTS_REQUIRED_HEADERS.filter(
        (required) => !headers.includes(required),
      );

      if (missingHeaders.length > 0) {
        throw new OurAirportsCsvContractError(
          `OurAirports CSV is missing required headers: ${missingHeaders.join(", ")}`,
        );
      }

      return headers;
    },
    skip_empty_lines: true,
  });

  if (!headerRead) {
    throw new OurAirportsCsvContractError(
      "OurAirports CSV does not contain a header row",
    );
  }

  return records.map((record) => {
    const rawData = Object.freeze({ ...rawDataSchema.parse(record) });
    const fields = ourAirportsRowFieldsSchema.parse(rawData);

    return Object.freeze({ ...fields, rawData });
  });
}
