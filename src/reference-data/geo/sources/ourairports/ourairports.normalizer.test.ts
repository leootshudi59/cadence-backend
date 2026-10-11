import { describe, expect, it } from "vitest";
import {
  GeoTzTimezoneResolver,
  type TimezoneResolver,
} from "../../timezone/timezone-resolver";
import {
  normalizeOurAirportsRow,
  normalizeOurAirportsRows,
  normalizeOurAirportsRowsWithRejections,
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

  it("keeps a unique resolver result even when an override is present", () => {
    const normalized = normalizeOurAirportsRow(iataRow(), parisResolver, {
      byIdent: { LFPG: "Asia/Shanghai" },
      byIata: {},
    });

    expect(normalized.ianaZone).toBe("Europe/Paris");
  });

  it("rejects ambiguous rows without a verified override", () => {
    const resolver = new GeoTzTimezoneResolver(() => [
      "Asia/Shanghai",
      "Asia/Urumqi",
    ]);
    const report = normalizeOurAirportsRowsWithRejections(
      [row({ ident: "CN-0237", iata_code: "HQL" })],
      resolver,
    );

    expect(report).toEqual({
      eligible: 1,
      normalized: [],
      rejected: [
        {
          externalId: "CN-0237",
          iataCode: "HQL",
          candidates: ["Asia/Shanghai", "Asia/Urumqi"],
        },
      ],
    });
  });

  it.each([
    [{ byIdent: { "CN-0237": "Asia/Shanghai" }, byIata: {} }, "Asia/Shanghai"],
    [{ byIdent: {}, byIata: { HQL: "Asia/Urumqi" } }, "Asia/Urumqi"],
  ] as const)("uses a matching explicit override", (overrides, expected) => {
    const resolver = new GeoTzTimezoneResolver(() => [
      "Asia/Shanghai",
      "Asia/Urumqi",
    ]);

    expect(
      normalizeOurAirportsRow(
        iataRow({ ident: "CN-0237", iata_code: "HQL" }),
        resolver,
        overrides,
      ).ianaZone,
    ).toBe(expected);
  });

  it("fails on an override that is not a resolver candidate", () => {
    const resolver = new GeoTzTimezoneResolver(() => [
      "Asia/Shanghai",
      "Asia/Urumqi",
    ]);

    expect(() =>
      normalizeOurAirportsRowsWithRejections(
        [row({ ident: "CN-0237", iata_code: "HQL" })],
        resolver,
        { byIdent: { "CN-0237": "Europe/Paris" }, byIata: {} },
      ),
    ).toThrow(/Invalid verified timezone override/);
  });
});
