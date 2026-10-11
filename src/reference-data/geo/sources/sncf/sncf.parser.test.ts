import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GeoTzTimezoneResolver } from "../../timezone/timezone-resolver";
import { normalizeSncfRows } from "./sncf.normalizer";
import { parseSncfCsv, SncfCsvContractError } from "./sncf.parser";

const headers =
  "Nom_Gare;Trigramme;Segment(s) DRG;Position géographique;Code commune;Code_UIC;Id_Gare";

describe("parseSncfCsv", () => {
  it("uses the real semicolon delimiter and CSV quoting rules", () => {
    const [row] = parseSncfCsv(
      `${headers}\nParis Gare de Lyon;PLY;"B;A";48.844888, 2.37352;75112;"87686030;87686006";station-id`,
    );

    expect(row?.["Segment(s) DRG"]).toBe("B;A");
    expect(row?.Code_UIC).toBe("87686030;87686006");
    expect(row?.rawData).toEqual({
      Nom_Gare: "Paris Gare de Lyon",
      Trigramme: "PLY",
      "Segment(s) DRG": "B;A",
      "Position géographique": "48.844888, 2.37352",
      "Code commune": "75112",
      Code_UIC: "87686030;87686006",
      Id_Gare: "station-id",
    });
  });

  it("rejects a missing required header", () => {
    expect(() =>
      parseSncfCsv(
        "Nom_Gare;Position géographique;Code_UIC;Id_Gare\nParis;48.8, 2.3;123;id",
      ),
    ).toThrow(SncfCsvContractError);
  });

  it("matches the tracked SNCF dataset contract and snapshot", () => {
    const csv = readFileSync(
      resolve("data/train-stations/gares-de-voyageurs.csv"),
      "utf8",
    );
    const rows = parseSncfCsv(csv);

    const countBlank = (field: "Nom_Gare" | "Id_Gare" | "Code_UIC") =>
      rows.filter((row) => row[field].trim() === "").length;
    const duplicateCount = (field: "Id_Gare" | "Code_UIC") => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const value = row[field].trim();
        if (value !== "") counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.values()].filter((count) => count > 1).length;
    };
    const hasValidCoordinates = (value: string) => {
      const match = /^\s*([^,]+?)\s*,\s*([^,]+?)\s*$/.exec(value);
      if (match === null) return false;
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    };
    const invalidCoordinateCount = rows.filter(
      (row) => !hasValidCoordinates(row["Position géographique"]),
    ).length;
    const eligibleCount = rows.filter(
      (row) =>
        row.Nom_Gare.trim() !== "" &&
        row.Id_Gare.trim() !== "" &&
        hasValidCoordinates(row["Position géographique"]),
    ).length;

    const normalized = normalizeSncfRows(rows, new GeoTzTimezoneResolver());

    expect(rows).toHaveLength(2_782);
    expect(eligibleCount).toBe(2_782);
    expect(normalized).toHaveLength(2_782);
    expect(countBlank("Id_Gare")).toBe(0);
    expect(countBlank("Nom_Gare")).toBe(0);
    expect(countBlank("Code_UIC")).toBe(0);
    expect(invalidCoordinateCount).toBe(0);
    expect(duplicateCount("Id_Gare")).toBe(0);
    expect(duplicateCount("Code_UIC")).toBe(0);

    const proof = Object.fromEntries(
      ["Paris Gare de Lyon", "Marseille Saint-Charles", "Brest"].map((name) => {
        const place = normalized.find((candidate) => candidate.name === name);
        expect(place).toBeDefined();
        return [
          name,
          {
            lat: place!.lat,
            lng: place!.lng,
            ianaZone: place!.ianaZone,
          },
        ];
      }),
    );

    expect(proof).toEqual({
      "Paris Gare de Lyon": {
        lat: 48.844888,
        lng: 2.37352,
        ianaZone: "Europe/Paris",
      },
      "Marseille Saint-Charles": {
        lat: 43.302666,
        lng: 5.380407,
        ianaZone: "Europe/Paris",
      },
      Brest: {
        lat: 48.38811,
        lng: -4.478903,
        ianaZone: "Europe/Paris",
      },
    });
  });
});
