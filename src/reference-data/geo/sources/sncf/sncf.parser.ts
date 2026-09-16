import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  SNCF_REQUIRED_HEADERS,
  type SncfRow,
  sncfRowFieldsSchema,
} from "./sncf-row";

const rawDataSchema = z.record(z.string(), z.string());

export class SncfCsvContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SncfCsvContractError";
  }
}

export function parseSncfCsv(csv: string): SncfRow[] {
  let headerRead = false;

  const records = parse(csv, {
    bom: true,
    columns: (headers: string[]) => {
      headerRead = true;
      const missingHeaders = SNCF_REQUIRED_HEADERS.filter(
        (required) => !headers.includes(required),
      );

      if (missingHeaders.length > 0) {
        throw new SncfCsvContractError(
          `SNCF CSV is missing required headers: ${missingHeaders.join(", ")}`,
        );
      }

      return headers;
    },
    delimiter: ";",
    skip_empty_lines: true,
  });

  if (!headerRead) {
    throw new SncfCsvContractError("SNCF CSV does not contain a header row");
  }

  return records.map((record) => {
    const rawData = Object.freeze({ ...rawDataSchema.parse(record) });
    const fields = sncfRowFieldsSchema.parse(rawData);

    return Object.freeze({ ...fields, rawData });
  });
}
