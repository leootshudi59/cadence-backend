import { describe, expect, it, vi } from "vitest";
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
      ourAirports: { normalized: 1, imported: 1 },
      sncf: { normalized: 1, imported: 1 },
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

  it("prints a concise per-source summary after a successful CLI run", async () => {
    const summary: PlaceImportSummary = {
      ourAirports: { normalized: 9_054, imported: 9_054 },
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
      "Place import complete: OurAirports normalized=9054 imported=9054; SNCF normalized=2782 imported=2782.",
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
