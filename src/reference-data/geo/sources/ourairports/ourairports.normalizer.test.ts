import { describe, expect, it } from "vitest";
import type { TimezoneResolver } from "../../timezone/timezone-resolver";
import {
  normalizeOurAirportsRow,
  normalizeOurAirportsRows,
} from "./ourairports.normalizer";
import {
  selectOurAirportsRowsWithIata,
  type OurAirportsRow,
} from "./ourairports-row";

const parisResolver: TimezoneResolver = {
  resolve: () => "Europe/Paris",
};

function row(overrides: Partial<OurAirportsRow> = {}): OurAirportsRow {
  const rawData = Object.freeze({
    ident: overrides.ident ?? "LFPG",
    name: overrides.name ?? "Charles de Gaulle International Airport",
    latitude_deg: overrides.latitude_deg ?? "49.00896",
    longitude_deg: overrides.longitude_deg ?? "2.554117",
    iso_country: overrides.iso_country ?? "fr",
    municipality: overrides.municipality ?? "Paris",
    iata_code: overrides.iata_code ?? "CDG",
    type: "large_airport",
    scheduled_service: "yes",
  });

  return { ...rawData, rawData };
}

function iataRow(overrides: Partial<OurAirportsRow> = {}) {
  const [selected] = selectOurAirportsRowsWithIata([row(overrides)]);
  if (selected === undefined) throw new Error("Expected an IATA row");
  return selected;
}

describe("normalizeOurAirportsRow", () => {
  it("maps canonical and provenance fields without provider leakage", () => {
    const sourceRow = iataRow();
    const normalized = normalizeOurAirportsRow(sourceRow, parisResolver);

    expect(normalized).toEqual({
      name: "Charles de Gaulle International Airport",
      category: "AIRPORT",
      address: null,
      city: "Paris",
      country: "FR",
      lat: 49.00896,
      lng: 2.554117,
      ianaZone: "Europe/Paris",
      iataCode: "CDG",
      source: {
        dataSourceCode: "OURAIRPORTS",
        externalId: "LFPG",
        externalCode: "CDG",
        rawData: sourceRow.rawData,
      },
    });
    expect(normalized.source.rawData).toBe(sourceRow.rawData);
  });

  it("maps an empty municipality to null", () => {
    expect(
      normalizeOurAirportsRow(iataRow({ municipality: "   " }), parisResolver)
        .city,
    ).toBeNull();
  });

  it.each([
    [{ ident: "  " }, /ident must not be blank/],
    [{ name: "  " }, /name must not be blank/],
  ] as const)("rejects required blank values", (overrides, message) => {
    expect(() =>
      normalizeOurAirportsRow(iataRow(overrides), parisResolver),
    ).toThrow(message);
  });

  it.each([
    { latitude_deg: "not-a-number" },
    { latitude_deg: "91" },
    { longitude_deg: "-181" },
  ])("rejects invalid source coordinates", (overrides) => {
    expect(() =>
      normalizeOurAirportsRow(iataRow(overrides), parisResolver),
    ).toThrow();
  });

  it("lets only non-empty IATA rows enter the normalization pipeline", () => {
    const normalized = normalizeOurAirportsRows(
      [row({ ident: "NO-IATA", iata_code: "" }), row()],
      parisResolver,
    );

    expect(normalized.map((place) => place.source.externalId)).toEqual([
      "LFPG",
    ]);
  });
});
