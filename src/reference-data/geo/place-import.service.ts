import { Prisma, PrismaClient } from "../../generated/prisma";
import { utcNowStoredDate } from "../../domain/time";
import type { NormalizedPlace } from "./normalized-place";

export type PlaceImportTransaction = Pick<
  Prisma.TransactionClient,
  "dataSource" | "placeSource"
>;

export interface PrivilegedPlaceDatabase {
  $transaction<T>(
    operation: (transaction: PlaceImportTransaction) => Promise<T>,
  ): Promise<T>;
}

export interface PlaceImportResult {
  readonly dataSourceId: string;
  readonly placeId: string;
  readonly placeSourceId: string;
}

type ImportTimestamp = Prisma.PlaceSourceCreateInput["lastSyncedAt"];

/** Persists provider-independent geographic reference data outside request RLS. */
export class PlaceImportService {
  constructor(
    private readonly database: PrivilegedPlaceDatabase = new PrismaClient(),
    private readonly currentTimestamp: () => ImportTimestamp = utcNowStoredDate,
  ) {}

  /**
   * Persists one normalized place through the privileged database connection.
   * Re-importing the same source code and external id updates its canonical
   * place and provenance instead of creating duplicates.
   *
   * @param place Provider-independent canonical and provenance data to import.
   * @returns The ids of the persisted data source, place, and provenance link.
   */
  importPlace(place: NormalizedPlace): Promise<PlaceImportResult> {
    return this.database.$transaction((transaction) =>
      this.importInTransaction(transaction, place),
    );
  }

  /**
   * Persists normalized places atomically through the privileged connection.
   * Each source code and external id remains idempotent within and across
   * batches; if any import fails, the whole collection is rolled back.
   *
   * @param places Provider-independent places to create or refresh.
   * @returns Persisted ids in the same order as the supplied places.
   */
  importPlaces(
    places: readonly NormalizedPlace[],
  ): Promise<readonly PlaceImportResult[]> {
    return this.database.$transaction(async (transaction) => {
      const results: PlaceImportResult[] = [];

      for (const place of places) {
        results.push(await this.importInTransaction(transaction, place));
      }

      return results;
    });
  }

  private async importInTransaction(
    transaction: PlaceImportTransaction,
    place: NormalizedPlace,
  ): Promise<PlaceImportResult> {
    const dataSource = await transaction.dataSource.upsert({
      where: { code: place.source.dataSourceCode },
      create: {
        code: place.source.dataSourceCode,
        name: place.source.dataSourceCode,
      },
      update: {},
      select: { id: true },
    });
    const canonicalData: Prisma.PlaceCreateWithoutPlaceSourcesInput = {
      name: place.name,
      category: place.category,
      address: place.address,
      city: place.city,
      country: place.country,
      lat: place.lat,
      lng: place.lng,
      ianaZone: place.ianaZone,
      iataCode: place.iataCode,
    };
    const provenanceData = {
      externalCode: place.source.externalCode,
      rawData: { ...place.source.rawData },
      lastSyncedAt: this.currentTimestamp(),
    } satisfies Pick<
      Prisma.PlaceSourceCreateInput,
      "externalCode" | "lastSyncedAt" | "rawData"
    >;
    const placeSource = await transaction.placeSource.upsert({
      where: {
        dataSourceId_externalId: {
          dataSourceId: dataSource.id,
          externalId: place.source.externalId,
        },
      },
      create: {
        ...provenanceData,
        externalId: place.source.externalId,
        dataSource: { connect: { id: dataSource.id } },
        place: { create: canonicalData },
      },
      update: {
        ...provenanceData,
        place: { update: canonicalData },
      },
      select: {
        id: true,
        placeId: true,
        dataSourceId: true,
      },
    });

    return {
      dataSourceId: placeSource.dataSourceId,
      placeId: placeSource.placeId,
      placeSourceId: placeSource.id,
    };
  }
}
