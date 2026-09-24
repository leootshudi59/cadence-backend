import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { PrismaClient } from "../../generated/prisma";
import {
  PlaceImportService,
  type PrivilegedPlaceDatabase,
} from "./place-import.service";
import { normalizeOurAirportsRows } from "./sources/ourairports/ourairports.normalizer";
import { parseOurAirportsCsv } from "./sources/ourairports/ourairports.parser";
import { normalizeSncfRows } from "./sources/sncf/sncf.normalizer";
import { parseSncfCsv } from "./sources/sncf/sncf.parser";
import {
  GeoTzTimezoneResolver,
  type TimezoneResolver,
} from "./timezone/timezone-resolver";

loadDotEnv({ quiet: true });

export const OURAIRPORTS_CSV_PATH = resolve(
  __dirname,
  "../../../data/ourairports/airports.csv",
);
export const SNCF_CSV_PATH = resolve(
  __dirname,
  "../../../data/train-stations/gares-de-voyageurs.csv",
);

type PlaceImporter = Pick<PlaceImportService, "importPlaces">;
type CsvReader = (path: string) => Promise<string>;

export interface PlaceImportSummary {
  readonly ourAirports: {
    readonly normalized: number;
    readonly imported: number;
  };
  readonly sncf: {
    readonly normalized: number;
    readonly imported: number;
  };
}

export interface PlaceDatasetImportOptions {
  readonly importer: PlaceImporter;
  readonly readCsv?: CsvReader;
  readonly timezoneResolver?: TimezoneResolver;
}

export interface DisconnectablePrivilegedPlaceDatabase extends PrivilegedPlaceDatabase {
  $disconnect(): Promise<void>;
}

type PlaceImportRunner = (
  importer: PlaceImporter,
) => Promise<PlaceImportSummary>;

export interface PlaceImportCliOptions {
  readonly database?: DisconnectablePrivilegedPlaceDatabase;
  readonly runImport?: PlaceImportRunner;
  readonly writeSummary?: (message: string) => void;
}

const readUtf8Csv: CsvReader = (path) => readFile(path, "utf8");

/**
 * Parses, normalizes, and imports both immutable geographic datasets.
 *
 * @param options Privileged importer plus optional offline test dependencies.
 * @returns Per-source normalized and persisted record counts.
 */
export async function importPlaceDatasets(
  options: PlaceDatasetImportOptions,
): Promise<PlaceImportSummary> {
  const readCsv = options.readCsv ?? readUtf8Csv;
  const timezoneResolver =
    options.timezoneResolver ?? new GeoTzTimezoneResolver();

  const ourAirportsCsv = await readCsv(OURAIRPORTS_CSV_PATH);
  const ourAirportsPlaces = normalizeOurAirportsRows(
    parseOurAirportsCsv(ourAirportsCsv),
    timezoneResolver,
  );
  const importedOurAirports =
    await options.importer.importPlaces(ourAirportsPlaces);

  const sncfCsv = await readCsv(SNCF_CSV_PATH);
  const sncfPlaces = normalizeSncfRows(parseSncfCsv(sncfCsv), timezoneResolver);
  const importedSncf = await options.importer.importPlaces(sncfPlaces);

  return {
    ourAirports: {
      normalized: ourAirportsPlaces.length,
      imported: importedOurAirports.length,
    },
    sncf: {
      normalized: sncfPlaces.length,
      imported: importedSncf.length,
    },
  };
}

export function formatPlaceImportSummary(summary: PlaceImportSummary): string {
  return [
    "Place import complete:",
    `OurAirports normalized=${summary.ourAirports.normalized} imported=${summary.ourAirports.imported};`,
    `SNCF normalized=${summary.sncf.normalized} imported=${summary.sncf.imported}.`,
  ].join(" ");
}

/**
 * Runs the manual privileged import and always closes its Prisma connection.
 *
 * @param options Optional lifecycle seams used by offline tests.
 * @returns The completed per-source import summary.
 */
export async function runPlaceImportCli(
  options: PlaceImportCliOptions = {},
): Promise<PlaceImportSummary> {
  const database = options.database ?? new PrismaClient();
  const runImport =
    options.runImport ?? ((importer) => importPlaceDatasets({ importer }));
  const writeSummary =
    options.writeSummary ??
    ((message) => {
      process.stdout.write(`${message}\n`);
    });

  try {
    const summary = await runImport(new PlaceImportService(database));
    writeSummary(formatPlaceImportSummary(summary));
    return summary;
  } finally {
    await database.$disconnect();
  }
}

function reportImportFailure(error: unknown): void {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`Place import failed: ${detail}\n`);
  process.exitCode = 1;
}

if (require.main === module) {
  void runPlaceImportCli().catch(reportImportFailure);
}
