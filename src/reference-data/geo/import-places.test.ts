import { describe, expect, it, vi } from "vitest";
import { GeoTzTimezoneResolver } from "./timezone/timezone-resolver";
import type { NormalizedPlace } from "./normalized-place";
import type {
  PlaceImportResult,
  PrivilegedPlaceDatabase,
} from "./place-import.service";
import {
  formatPlaceImportSummary,
  importPlaceDatasets,
  OURAIRPORTS_CSV_PATH,
  runPlaceImportCli,
  SNCF_CSV_PATH,
  type DisconnectablePrivilegedPlaceDatabase,
  type PlaceImportSummary,
} from "./import-places";

const ourAirportsCsv = [
  "ident,name,latitude_deg,longitude_deg,iso_country,municipality,iata_code",
  'LFPG,"Charles de Gaulle International Airport",49.00896,2.554117,FR,Paris,CDG',
  "NO-IATA,Ignored Airport,48.1,2.1,FR,Paris,",
].join("\n");

const sncfCsv = [
  "Nom_Gare;Trigramme;Segment(s) DRG;Position géographique;Code commune;Code_UIC;Id_Gare",
  'Paris Gare de Lyon;PLY;A;"48.844888, 2.37352";75112;87686030;station-lyon',
].join("\n");

function importResults(
  places: readonly NormalizedPlace[],
): readonly PlaceImportResult[] {
  return places.map((place, index) => ({
    dataSourceId: `data-source-${place.source.dataSourceCode}`,
    placeId: `place-${index}`,
    placeSourceId: `place-source-${index}`,
  }));
}

describe("geographic place import runner", () => {
  it("parses, normalizes, and hands both source batches to one importer", async () => {
    const importedBatches: NormalizedPlace[][] = [];
    const importer = {
      importPlaces: (places: readonly NormalizedPlace[]) => {
        importedBatches.push([...places]);
        return Promise.resolve(importResults(places));
      },
    };
    const readCsv = vi.fn((path: string) => {
      if (path === OURAIRPORTS_CSV_PATH) {
        return Promise.resolve(ourAirportsCsv);
      }
      if (path === SNCF_CSV_PATH) {
        return Promise.resolve(sncfCsv);
      }
      return Promise.reject(new Error(`Unexpected dataset path: ${path}`));
    });
    const resolveTimezone = vi.fn(() => "Europe/Paris");

    const summary = await importPlaceDatasets({
      importer,
      readCsv,
      timezoneResolver: { resolve: resolveTimezone },
    });

    expect(readCsv).toHaveBeenNthCalledWith(1, OURAIRPORTS_CSV_PATH);
    expect(readCsv).toHaveBeenNthCalledWith(2, SNCF_CSV_PATH);
    expect(importedBatches).toHaveLength(2);
    expect(importedBatches[0]).toHaveLength(1);
    expect(importedBatches[0]?.[0]).toMatchObject({
      name: "Charles de Gaulle International Airport",
      category: "AIRPORT",
      iataCode: "CDG",
      ianaZone: "Europe/Paris",
      source: {
        dataSourceCode: "OURAIRPORTS",
        externalId: "LFPG",
      },
    });
    expect(importedBatches[1]).toHaveLength(1);
    expect(importedBatches[1]?.[0]).toMatchObject({
      name: "Paris Gare de Lyon",
      category: "STATION",
      country: "FR",
      ianaZone: "Europe/Paris",
      source: {
        dataSourceCode: "SNCF",
        externalId: "station-lyon",
        externalCode: "87686030",
      },
    });
    expect(resolveTimezone).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      ourAirports: { eligible: 1, normalized: 1, rejected: 0, imported: 1 },
      sncf: { normalized: 1, imported: 1 },
    });
  });

  it("reports ambiguous airports and imports only normalized places", async () => {
    const importedBatches: NormalizedPlace[][] = [];
    const importer = {
      importPlaces: (places: readonly NormalizedPlace[]) => {
        importedBatches.push([...places]);
        return Promise.resolve(importResults(places));
      },
    };
    const ambiguousCsv = [
      ourAirportsCsv,
      "CN-0237,Tashikuergan Hongqilafu Airport,37.661333,75.288877,CN,Tashikuergan,HQL",
    ].join("\n");
    const readCsv = (path: string) =>
      Promise.resolve(path === OURAIRPORTS_CSV_PATH ? ambiguousCsv : sncfCsv);
    const timezoneResolver = new GeoTzTimezoneResolver((lat) =>
      lat === 37.661333 ? ["Asia/Shanghai", "Asia/Urumqi"] : ["Europe/Paris"],
    );

    const summary = await importPlaceDatasets({
      importer,
      readCsv,
      timezoneResolver,
    });

    expect(importedBatches[0]?.map((place) => place.source.externalId)).toEqual(
      ["LFPG"],
    );
    expect(summary).toEqual({
      ourAirports: { eligible: 2, normalized: 1, rejected: 1, imported: 1 },
      sncf: { normalized: 1, imported: 1 },
    });
  });

  it("passes large source datasets to the importer in bounded concurrent batches", async () => {
    const airportRows = Array.from({ length: 451 }, (_, index) => {
      const iata = `A${index.toString(36).toUpperCase().padStart(2, "0")}`;
      return `TEST-${index},Airport ${index},48,2,FR,Paris,${iata}`;
    });
    const csv = [ourAirportsCsv.split("\n")[0], ...airportRows].join("\n");
    const importedBatchSizes: number[] = [];
    let activeBatches = 0;
    let peakActiveBatches = 0;
    const importer = {
      importPlaces: async (places: readonly NormalizedPlace[]) => {
        importedBatchSizes.push(places.length);
        activeBatches += 1;
        peakActiveBatches = Math.max(peakActiveBatches, activeBatches);
        await new Promise((resolve) => setTimeout(resolve, 0));
        activeBatches -= 1;
        return importResults(places);
      },
    };

    const summary = await importPlaceDatasets({
      importer,
      readCsv: (path) =>
        Promise.resolve(path === OURAIRPORTS_CSV_PATH ? csv : sncfCsv),
      timezoneResolver: { resolve: () => "Europe/Paris" },
    });

    expect(importedBatchSizes).toEqual([...Array<number>(9).fill(50), 1, 1]);
    expect(peakActiveBatches).toBe(8);
    expect(summary.ourAirports).toEqual({
      eligible: 451,
      normalized: 451,
      rejected: 0,
      imported: 451,
    });
  });

  it("always disconnects the privileged client when an import fails", async () => {
    const disconnect = vi.fn(() => Promise.resolve());
    const database = {
      $transaction: vi.fn<PrivilegedPlaceDatabase["$transaction"]>(),
      $disconnect: disconnect,
    } as DisconnectablePrivilegedPlaceDatabase;
    const importFailure = new Error("import failed");
    const runImport = vi.fn(() => Promise.reject(importFailure));
    const writeSummary = vi.fn<(message: string) => void>();

    await expect(
      runPlaceImportCli({ database, runImport, writeSummary }),
    ).rejects.toBe(importFailure);

    expect(disconnect).toHaveBeenCalledOnce();
    expect(writeSummary).not.toHaveBeenCalled();
  });

  it("constructs the import database from DIRECT_URL instead of DATABASE_URL", async () => {
    const directUrl = "postgresql://postgres@privileged.invalid/cadence";
    const disconnect = vi.fn(() => Promise.resolve());
    const database = {
      $transaction: vi.fn<PrivilegedPlaceDatabase["$transaction"]>(),
      $disconnect: disconnect,
    } as DisconnectablePrivilegedPlaceDatabase;
    const createDatabase = vi.fn(() => database);
    const summary: PlaceImportSummary = {
      ourAirports: { eligible: 3, normalized: 3, rejected: 0, imported: 3 },
      sncf: { normalized: 3, imported: 3 },
    };
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://rls_client@runtime.invalid/cadence",
    );
    vi.stubEnv("DIRECT_URL", directUrl);

    try {
      await expect(
        runPlaceImportCli({
          createDatabase,
          runImport: () => Promise.resolve(summary),
          writeSummary: vi.fn(),
        }),
      ).resolves.toEqual(summary);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(createDatabase).toHaveBeenCalledExactlyOnceWith(directUrl);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("fails before database construction when DIRECT_URL is missing", async () => {
    const createDatabase = vi.fn();
    const runImport = vi.fn();
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://rls_client@runtime.invalid/cadence",
    );
    vi.stubEnv("DIRECT_URL", "");

    try {
      await expect(
        runPlaceImportCli({ createDatabase, runImport }),
      ).rejects.toThrow(
        "DIRECT_URL must be configured for the privileged place import",
      );
    } finally {
      vi.unstubAllEnvs();
    }

    expect(createDatabase).not.toHaveBeenCalled();
    expect(runImport).not.toHaveBeenCalled();
  });

  it("prints a concise per-source summary after a successful CLI run", async () => {
    const summary: PlaceImportSummary = {
      ourAirports: {
        eligible: 9_054,
        normalized: 9_023,
        rejected: 31,
        imported: 9_023,
      },
      sncf: { normalized: 2_782, imported: 2_782 },
    };
    const disconnect = vi.fn(() => Promise.resolve());
    const database = {
      $transaction: vi.fn<PrivilegedPlaceDatabase["$transaction"]>(),
      $disconnect: disconnect,
    } as DisconnectablePrivilegedPlaceDatabase;
    const writeSummary = vi.fn<(message: string) => void>();

    await expect(
      runPlaceImportCli({
        database,
        runImport: () => Promise.resolve(summary),
        writeSummary,
      }),
    ).resolves.toEqual(summary);

    expect(writeSummary).toHaveBeenCalledExactlyOnceWith(
      formatPlaceImportSummary(summary),
    );
    expect(writeSummary).toHaveBeenCalledWith(
      "Place import complete: OurAirports eligible=9054 normalized=9023 rejected=31 imported=9023; SNCF normalized=2782 imported=2782.",
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
