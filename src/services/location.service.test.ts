import { describe, expect, it, vi } from "vitest";
import { AIRPORTS_BY_IATA } from "../constants/location.constants";
import { UnresolvedTimezoneError } from "../domain/errors";
import type { Place } from "../generated/prisma/client";
import type { ILocationRepository } from "../repositories/interfaces/ILocationRepository";
import type { RlsTransactionClient } from "../repositories/types";
import { LocationService } from "./location.service";

const transaction = {} as RlsTransactionClient;

function databasePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "database-place",
    name: "Narita International Airport",
    city: "Narita",
    country: "JP",
    ianaZone: "Asia/Tokyo",
    iataCode: "NRT",
    ...overrides,
  } as Place;
}

function setup() {
  const repository = {
    findByCoordinates: vi.fn<ILocationRepository["findByCoordinates"]>(),
    findByIataCode: vi.fn<ILocationRepository["findByIataCode"]>(),
  };

  return {
    repository,
    service: new LocationService(repository),
  };
}

describe("LocationService", () => {
  it.each([
    {
      code: "CDG",
      name: "Charles de Gaulle International Airport",
      city: "Paris (Roissy-en-France, Val-d'Oise)",
      country: "FR",
      ianaZone: "Europe/Paris",
    },
    {
      code: "HEL",
      name: "Helsinki Vantaa Airport",
      city: "Helsinki (Vantaa)",
      country: "FI",
      ianaZone: "Europe/Helsinki",
    },
    {
      code: "NRT",
      name: "Narita International Airport",
      city: "Narita",
      country: "JP",
      ianaZone: "Asia/Tokyo",
    },
  ])("prefers the canonical database place for $code", async (airport) => {
    const { repository, service } = setup();
    repository.findByIataCode.mockResolvedValue(
      databasePlace({
        id: `database-${airport.code}`,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        ianaZone: airport.ianaZone,
        iataCode: airport.code,
      }),
    );

    await expect(
      service.resolve(transaction, {
        source: "iata",
        iataCode: airport.code,
      }),
    ).resolves.toEqual({
      city: airport.city,
      country: airport.country,
      ianaZone: airport.ianaZone,
      iataCode: airport.code,
      name: airport.name,
      placeId: `database-${airport.code}`,
    });
    expect(repository.findByIataCode).toHaveBeenCalledExactlyOnceWith(
      transaction,
      airport.code,
    );
    expect(repository.findByCoordinates).not.toHaveBeenCalled();
  });

  it("uses the static airport only when the database has no match", async () => {
    const { repository, service } = setup();
    repository.findByIataCode.mockResolvedValue(null);

    await expect(
      service.resolve(transaction, { source: "iata", iataCode: "NRT" }),
    ).resolves.toEqual({
      ...AIRPORTS_BY_IATA.NRT,
      iataCode: "NRT",
      placeId: null,
    });
    expect(repository.findByIataCode).toHaveBeenCalledExactlyOnceWith(
      transaction,
      "NRT",
    );
  });

  it("does not hide a database failure behind the fallback", async () => {
    const { repository, service } = setup();
    const failure = new Error("database unavailable");
    repository.findByIataCode.mockRejectedValue(failure);

    await expect(
      service.resolve(transaction, { source: "iata", iataCode: "NRT" }),
    ).rejects.toBe(failure);
  });

  it("rejects an unknown IATA code when the database has no match", async () => {
    const { repository, service } = setup();
    repository.findByIataCode.mockResolvedValue(null);

    await expect(
      service.resolve(transaction, { source: "iata", iataCode: "ZZZ" }),
    ).rejects.toThrow(
      new UnresolvedTimezoneError(
        "No authoritative IANA zone exists for IATA code ZZZ",
      ),
    );
  });

  it("does not use the fallback for an incomplete database place", async () => {
    const { repository, service } = setup();
    repository.findByIataCode.mockResolvedValue(databasePlace({ city: null }));

    await expect(
      service.resolve(transaction, { source: "iata", iataCode: "NRT" }),
    ).rejects.toBeInstanceOf(UnresolvedTimezoneError);
  });

  it("does not use the fallback for an invalid stored IANA zone", async () => {
    const { repository, service } = setup();
    repository.findByIataCode.mockResolvedValue(
      databasePlace({ ianaZone: "Not/A_Real_Zone" }),
    );

    await expect(
      service.resolve(transaction, { source: "iata", iataCode: "NRT" }),
    ).rejects.toBeInstanceOf(UnresolvedTimezoneError);
  });

  it("resolves coordinates through the repository without an airport fallback", async () => {
    const { repository, service } = setup();
    repository.findByCoordinates.mockResolvedValue(databasePlace());

    await expect(
      service.resolve(transaction, {
        source: "coordinates",
        latitude: 35.76858,
        longitude: 140.388714,
      }),
    ).resolves.toEqual({
      city: "Narita",
      country: "JP",
      ianaZone: "Asia/Tokyo",
      iataCode: "NRT",
      name: "Narita International Airport",
      placeId: "database-place",
    });
    expect(repository.findByCoordinates).toHaveBeenCalledExactlyOnceWith(
      transaction,
      35.76858,
      140.388714,
    );
    expect(repository.findByIataCode).not.toHaveBeenCalled();
  });

  it("preserves the unknown-coordinate error", async () => {
    const { repository, service } = setup();
    repository.findByCoordinates.mockResolvedValue(null);

    await expect(
      service.resolve(transaction, {
        source: "coordinates",
        latitude: 0,
        longitude: 0,
      }),
    ).rejects.toThrow(
      new UnresolvedTimezoneError(
        "No authoritative IANA zone exists for these coordinates",
      ),
    );
    expect(repository.findByIataCode).not.toHaveBeenCalled();
  });
});
