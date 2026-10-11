import { describe, expect, it, vi } from "vitest";
import type { TimezoneResolver } from "../../timezone/timezone-resolver";
import { normalizeSncfRow } from "./sncf.normalizer";
import type { SncfRow } from "./sncf-row";

const parisResolver: TimezoneResolver = {
  resolve: () => "Europe/Paris",
};

function row(overrides: Partial<SncfRow> = {}): SncfRow {
  const rawData = Object.freeze({
    Nom_Gare: overrides.Nom_Gare ?? "Paris Gare de Lyon",
    Trigramme: overrides.Trigramme ?? "PLY",
    "Segment(s) DRG": overrides["Segment(s) DRG"] ?? "B;A",
    "Position géographique":
      overrides["Position géographique"] ?? "48.844888, 2.37352",
    "Code commune": overrides["Code commune"] ?? "75112",
    Code_UIC: overrides.Code_UIC ?? "87686030;87686006",
    Id_Gare: overrides.Id_Gare ?? "a6433423-9738-42fd-a125-321b28d78e8a",
  });

  return { ...rawData, rawData: overrides.rawData ?? rawData };
}

describe("normalizeSncfRow", () => {
  it("maps canonical station fields and keeps SNCF identity in provenance", () => {
    const sourceRow = row();
    const normalized = normalizeSncfRow(sourceRow, parisResolver);

    expect(normalized).toEqual({
      name: "Paris Gare de Lyon",
      category: "STATION",
      address: null,
      city: null,
      country: "FR",
      lat: 48.844888,
      lng: 2.37352,
      ianaZone: "Europe/Paris",
      iataCode: null,
      source: {
        dataSourceCode: "SNCF",
        externalId: "a6433423-9738-42fd-a125-321b28d78e8a",
        externalCode: "87686030;87686006",
        rawData: sourceRow.rawData,
      },
    });
    expect(normalized.source.rawData).toBe(sourceRow.rawData);
  });

  it("keeps city null because the source has no municipality field", () => {
    expect(normalizeSncfRow(row(), parisResolver).city).toBeNull();
  });

  it("allows a missing UIC code and maps it to null", () => {
    expect(
      normalizeSncfRow(row({ Code_UIC: "   " }), parisResolver).source
        .externalCode,
    ).toBeNull();
  });

  it.each([
    [{ Nom_Gare: "  " }, /Nom_Gare must not be blank/],
    [{ Id_Gare: "  " }, /Id_Gare must not be blank/],
  ] as const)("rejects required blank values", (overrides, message) => {
    expect(() => normalizeSncfRow(row(overrides), parisResolver)).toThrow(
      message,
    );
  });

  it.each([
    { "Position géographique": "not-coordinates" },
    { "Position géographique": "north, east" },
    { "Position géographique": "91, 2" },
    { "Position géographique": "48, -181" },
  ])("rejects malformed or out-of-range coordinates", (overrides) => {
    expect(() => normalizeSncfRow(row(overrides), parisResolver)).toThrow();
  });

  it("passes parsed coordinates to the shared timezone resolver", () => {
    const resolve = vi.fn(() => "Europe/Paris");
    const normalized = normalizeSncfRow(row(), { resolve });

    expect(resolve).toHaveBeenCalledExactlyOnceWith(48.844888, 2.37352);
    expect(normalized.ianaZone).toBe("Europe/Paris");
  });
});
