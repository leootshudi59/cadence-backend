import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import { localDateTimeToStoredDate, type StoredDate } from "../../domain/time";
import type { NormalizedPlace } from "./normalized-place";
import {
  PlaceImportService,
  type PlaceImportTransaction,
  type PrivilegedPlaceDatabase,
} from "./place-import.service";
import { normalizeOurAirportsRow } from "./sources/ourairports/ourairports.normalizer";
import {
  selectOurAirportsRowsWithIata,
  type OurAirportsRow,
} from "./sources/ourairports/ourairports-row";
import { normalizeSncfRow } from "./sources/sncf/sncf.normalizer";
import type { SncfRow } from "./sources/sncf/sncf-row";
import type { TimezoneResolver } from "./timezone/timezone-resolver";

interface StoredDataSource {
  id: string;
  code: string;
  name: string;
}

type StoredPlace = Omit<NormalizedPlace, "source"> & { id: string };

interface StoredPlaceSource {
  id: string;
  placeId: string;
  dataSourceId: string;
  externalId: string;
  externalCode: string | null;
  rawData: Readonly<Record<string, string>>;
  lastSyncedAt: StoredDate;
}

interface ImportState {
  dataSources: StoredDataSource[];
  places: StoredPlace[];
  placeSources: StoredPlaceSource[];
}

interface DataSourceUpsertArgs {
  where: { code: string };
  create: { code: string; name: string };
}

interface PlaceSourceUpsertData {
  externalCode: string | null;
  rawData: Readonly<Record<string, string>>;
  lastSyncedAt: StoredDate;
  place: { update: Omit<NormalizedPlace, "source"> };
}

interface PlaceSourceUpsertArgs {
  where: {
    dataSourceId_externalId: {
      dataSourceId: string;
      externalId: string;
    };
  };
  create: {
    externalId: string;
    externalCode: string | null;
    rawData: Readonly<Record<string, string>>;
    lastSyncedAt: StoredDate;
    dataSource: { connect: { id: string } };
    place: { create: Omit<NormalizedPlace, "source"> };
  };
  update: PlaceSourceUpsertData;
}

class InMemoryPrivilegedPlaceDatabase {
  private state: ImportState = {
    dataSources: [],
    places: [],
    placeSources: [],
  };

  failAfterPlaceCreate = false;

  asDatabase(): PrivilegedPlaceDatabase {
    return {
      $transaction: async <T>(
        operation: (transaction: PlaceImportTransaction) => Promise<T>,
      ): Promise<T> => {
        const working = structuredClone(this.state);
        const result = await operation(this.transactionFor(working));
        this.state = working;
        return result;
      },
    };
  }

  snapshot(): ImportState {
    return structuredClone(this.state);
  }

  private transactionFor(state: ImportState): PlaceImportTransaction {
    const dataSource = {
      upsert: (untypedArgs: unknown) => {
        const args = untypedArgs as DataSourceUpsertArgs;
        let record = state.dataSources.find(
          (candidate) => candidate.code === args.where.code,
        );

        if (record === undefined) {
          record = {
            id: `data-source-${state.dataSources.length + 1}`,
            ...args.create,
          };
          state.dataSources.push(record);
        }

        return { id: record.id };
      },
    };
    const placeSource = {
      upsert: (untypedArgs: unknown) => {
        const args = untypedArgs as PlaceSourceUpsertArgs;
        const identity = args.where.dataSourceId_externalId;
        const existing = state.placeSources.find(
          (candidate) =>
            candidate.dataSourceId === identity.dataSourceId &&
            candidate.externalId === identity.externalId,
        );

        if (existing !== undefined) {
          const canonical = state.places.find(
            (candidate) => candidate.id === existing.placeId,
          );
          if (canonical === undefined) {
            throw new Error("Stored provenance has no canonical place");
          }

          Object.assign(canonical, args.update.place.update);
          Object.assign(existing, {
            externalCode: args.update.externalCode,
            rawData: args.update.rawData,
            lastSyncedAt: args.update.lastSyncedAt,
          });
          return {
            id: existing.id,
            placeId: existing.placeId,
            dataSourceId: existing.dataSourceId,
          };
        }

        const canonical: StoredPlace = {
          id: `place-${state.places.length + 1}`,
          ...args.create.place.create,
        };
        state.places.push(canonical);
        if (this.failAfterPlaceCreate) {
          throw new Error("Injected provenance failure");
        }

        const provenance: StoredPlaceSource = {
          id: `place-source-${state.placeSources.length + 1}`,
          placeId: canonical.id,
          dataSourceId: args.create.dataSource.connect.id,
          externalId: args.create.externalId,
          externalCode: args.create.externalCode,
          rawData: args.create.rawData,
          lastSyncedAt: args.create.lastSyncedAt,
        };
        state.placeSources.push(provenance);

        return {
          id: provenance.id,
          placeId: provenance.placeId,
          dataSourceId: provenance.dataSourceId,
        };
      },
    };

    return { dataSource, placeSource } as unknown as PlaceImportTransaction;
  }
}

const parisResolver: TimezoneResolver = {
  resolve: () => "Europe/Paris",
};

function normalizedPlace(
  overrides: Partial<Omit<NormalizedPlace, "source">> & {
    source?: Partial<NormalizedPlace["source"]>;
  } = {},
): NormalizedPlace {
  return {
    name: "Charles de Gaulle International Airport",
    category: "AIRPORT",
    address: null,
    city: "Paris",
    country: "FR",
    lat: 49.00896,
    lng: 2.554117,
    ianaZone: "Europe/Paris",
    iataCode: "CDG",
    ...overrides,
    source: {
      dataSourceCode: "OURAIRPORTS",
      externalId: "LFPG",
      externalCode: "CDG",
      rawData: { ident: "LFPG", name: "Charles de Gaulle" },
      ...overrides.source,
    },
  };
}

function normalizedOurAirportsPlace(): NormalizedPlace {
  const rawData = Object.freeze({
    ident: "LFPG",
    name: "Charles de Gaulle International Airport",
    latitude_deg: "49.00896",
    longitude_deg: "2.554117",
    iso_country: "FR",
    municipality: "Paris",
    iata_code: "CDG",
    type: "large_airport",
    scheduled_service: "yes",
  });
  const row: OurAirportsRow = { ...rawData, rawData };
  const [iataRow] = selectOurAirportsRowsWithIata([row]);
  if (iataRow === undefined) throw new Error("Expected an IATA airport row");

  return normalizeOurAirportsRow(iataRow, parisResolver);
}

function normalizedSncfPlace(): NormalizedPlace {
  const rawData = Object.freeze({
    Nom_Gare: "Paris Gare de Lyon",
    Trigramme: "PLY",
    "Segment(s) DRG": "B;A",
    "Position géographique": "48.844888, 2.37352",
    "Code commune": "75112",
    Code_UIC: "87686030;87686006",
    Id_Gare: "a6433423-9738-42fd-a125-321b28d78e8a",
  });
  const row: SncfRow = { ...rawData, rawData };

  return normalizeSncfRow(row, parisResolver);
}

describe("PlaceImportService", () => {
  it("creates one data source, canonical place, and provenance link", async () => {
    const database = new InMemoryPrivilegedPlaceDatabase();
    const service = new PlaceImportService(database.asDatabase());

    const result = await service.importPlace(normalizedPlace());
    const state = database.snapshot();

    expect(state.dataSources).toHaveLength(1);
    expect(state.places).toHaveLength(1);
    expect(state.placeSources).toHaveLength(1);
    expect(state.dataSources[0]).toMatchObject({ code: "OURAIRPORTS" });
    expect(state.placeSources[0]).toMatchObject({
      placeId: state.places[0]?.id,
      dataSourceId: state.dataSources[0]?.id,
      externalId: "LFPG",
    });
    expect(result).toEqual({
      placeId: state.places[0]?.id,
      dataSourceId: state.dataSources[0]?.id,
      placeSourceId: state.placeSources[0]?.id,
    });
  });

  it("updates canonical and source data on an idempotent re-import", async () => {
    const database = new InMemoryPrivilegedPlaceDatabase();
    const firstSync = localDateTimeToStoredDate({
      local: "2026-09-23T08:00:00",
      ianaZone: "UTC",
    });
    const secondSync = localDateTimeToStoredDate({
      local: "2026-09-24T08:00:00",
      ianaZone: "UTC",
    });
    const timestamps = [firstSync, secondSync];
    const service = new PlaceImportService(database.asDatabase(), () => {
      const timestamp = timestamps.shift();
      if (timestamp === undefined) throw new Error("Missing test timestamp");
      return timestamp;
    });

    const first = await service.importPlace(normalizedPlace());
    const second = await service.importPlace(
      normalizedPlace({
        name: "Paris Charles de Gaulle Airport",
        city: "Roissy-en-France",
        lat: 49.009,
        source: {
          externalCode: "CDG-UPDATED",
          rawData: { ident: "LFPG", revision: "2" },
        },
      }),
    );
    const state = database.snapshot();

    expect(second).toEqual(first);
    expect(state.dataSources).toHaveLength(1);
    expect(state.places).toHaveLength(1);
    expect(state.placeSources).toHaveLength(1);
    expect(state.places[0]).toMatchObject({
      name: "Paris Charles de Gaulle Airport",
      city: "Roissy-en-France",
      lat: 49.009,
    });
    expect(state.placeSources[0]).toMatchObject({
      externalCode: "CDG-UPDATED",
      rawData: { ident: "LFPG", revision: "2" },
      lastSyncedAt: secondSync,
    });
  });

  it("creates distinct canonical places for different external ids", async () => {
    const database = new InMemoryPrivilegedPlaceDatabase();
    const service = new PlaceImportService(database.asDatabase());

    const results = await service.importPlaces([
      normalizedPlace(),
      normalizedPlace({
        name: "Helsinki Airport",
        city: "Helsinki",
        country: "FI",
        lat: 60.3172,
        lng: 24.9633,
        ianaZone: "Europe/Helsinki",
        iataCode: "HEL",
        source: {
          externalId: "EFHK",
          externalCode: "HEL",
          rawData: { ident: "EFHK" },
        },
      }),
    ]);
    const state = database.snapshot();

    expect(state.dataSources).toHaveLength(1);
    expect(state.places).toHaveLength(2);
    expect(state.placeSources).toHaveLength(2);
    expect(new Set(results.map((result) => result.placeId)).size).toBe(2);
  });

  it("imports OurAirports and SNCF normalized values through the same API", async () => {
    const database = new InMemoryPrivilegedPlaceDatabase();
    const service = new PlaceImportService(database.asDatabase());

    await service.importPlaces([
      normalizedOurAirportsPlace(),
      normalizedSncfPlace(),
    ]);
    const state = database.snapshot();

    expect(state.dataSources.map(({ code }) => code)).toEqual([
      "OURAIRPORTS",
      "SNCF",
    ]);
    expect(state.places.map(({ category }) => category)).toEqual([
      "AIRPORT",
      "STATION",
    ]);
    expect(state.placeSources).toHaveLength(2);
  });

  it("rolls back a canonical place when provenance persistence fails", async () => {
    const database = new InMemoryPrivilegedPlaceDatabase();
    database.failAfterPlaceCreate = true;
    const service = new PlaceImportService(database.asDatabase());

    await expect(service.importPlace(normalizedPlace())).rejects.toThrow(
      "Injected provenance failure",
    );

    expect(database.snapshot()).toEqual({
      dataSources: [],
      places: [],
      placeSources: [],
    });
  });

  it("exposes only NormalizedPlace and avoids request/RLS/source adapters", () => {
    expectTypeOf<
      Parameters<PlaceImportService["importPlace"]>[0]
    >().toEqualTypeOf<NormalizedPlace>();

    const serviceSource = readFileSync(
      join(__dirname, "place-import.service.ts"),
      "utf8",
    );
    expect(serviceSource).not.toMatch(
      /RequestAuth|RlsUnitOfWork|PrismaService|rls_client|OurAirportsRow|SncfRow|csv-parse/,
    );
  });
});
