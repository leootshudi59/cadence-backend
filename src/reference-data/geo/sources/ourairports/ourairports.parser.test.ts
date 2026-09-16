import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GeoTzTimezoneResolver } from "../../timezone/timezone-resolver";
import { normalizeOurAirportsRow } from "./ourairports.normalizer";
import {
  OurAirportsCsvContractError,
  parseOurAirportsCsv,
} from "./ourairports.parser";
import {
  OurAirportsDataQualityError,
  selectOurAirportsRowsWithIata,
} from "./ourairports-row";

const headers =
  "ident,name,latitude_deg,longitude_deg,iso_country,municipality,iata_code,keywords";

describe("parseOurAirportsCsv", () => {
  it("uses CSV quoting rules and preserves the complete raw row", () => {
    const [row] = parseOurAirportsCsv(
      `${headers}\nLFPG,"Paris, Charles de Gaulle",49.00896,2.554117,FR,Paris,CDG,"Paris, France"`,
    );

    expect(row?.name).toBe("Paris, Charles de Gaulle");
    expect(row?.rawData).toEqual({
      ident: "LFPG",
      name: "Paris, Charles de Gaulle",
      latitude_deg: "49.00896",
      longitude_deg: "2.554117",
      iso_country: "FR",
      municipality: "Paris",
      iata_code: "CDG",
      keywords: "Paris, France",
    });
  });

  it("rejects a missing required header", () => {
    expect(() =>
      parseOurAirportsCsv(
        "ident,name,latitude_deg,longitude_deg,iso_country,municipality\nLFPG,CDG,49,2,FR,Paris",
      ),
    ).toThrow(OurAirportsCsvContractError);
  });

  it("filters empty IATA rows normally", () => {
    const rows = parseOurAirportsCsv(
      `${headers}\n00A,No IATA,40,-74,US,Bensalem,,heliport\nLFPG,CDG,49,2,FR,Paris,CDG,airport`,
    );

    expect(selectOurAirportsRowsWithIata(rows).map((row) => row.ident)).toEqual(
      ["LFPG"],
    );
  });

  it("does not filter by airport type or scheduled-service status", () => {
    const rows = parseOurAirportsCsv(
      `${headers}\nH001,Private heliport,40,-74,US,Bensalem,H01,"type=heliport;scheduled_service=no"`,
    );

    expect(selectOurAirportsRowsWithIata(rows)).toHaveLength(1);
  });

  it("normalizes a non-empty IATA before validating it", () => {
    const rows = parseOurAirportsCsv(
      `${headers}\nLFPG,CDG,49,2,FR,Paris," cdg ",airport`,
    );

    expect(selectOurAirportsRowsWithIata(rows)[0]?.iata_code).toBe("CDG");
  });

  it("rejects a malformed non-empty IATA instead of dropping it", () => {
    const rows = parseOurAirportsCsv(
      `${headers}\nBAD,Bad code,49,2,FR,Paris,AB!,airport`,
    );

    expect(() => selectOurAirportsRowsWithIata(rows)).toThrow(
      OurAirportsDataQualityError,
    );
  });

  it("matches the tracked OurAirports dataset contract and snapshot", () => {
    const csv = readFileSync(resolve("data/ourairports/airports.csv"), "utf8");
    const rows = parseOurAirportsCsv(csv);
    const rowsWithIata = selectOurAirportsRowsWithIata(rows);
    const countsByIata = new Map<string, number>();

    for (const row of rowsWithIata) {
      countsByIata.set(
        row.iata_code,
        (countsByIata.get(row.iata_code) ?? 0) + 1,
      );
    }

    const duplicateIataCount = [...countsByIata.values()].filter(
      (count) => count > 1,
    ).length;

    expect(rows).toHaveLength(85_957);
    expect(rowsWithIata).toHaveLength(9_054);
    expect(duplicateIataCount).toBe(0);

    const resolver = new GeoTzTimezoneResolver();
    const proof = Object.fromEntries(
      ["CDG", "HEL", "NRT"].map((iataCode) => {
        const row = rowsWithIata.find(
          (candidate) => candidate.iata_code === iataCode,
        );
        expect(row).toBeDefined();

        const normalized = normalizeOurAirportsRow(row!, resolver);
        return [
          iataCode,
          {
            ianaZone: normalized.ianaZone,
            lat: normalized.lat,
            lng: normalized.lng,
          },
        ];
      }),
    );

    expect(proof).toEqual({
      CDG: { ianaZone: "Europe/Paris", lat: 49.00896, lng: 2.554117 },
      HEL: { ianaZone: "Europe/Helsinki", lat: 60.318363, lng: 24.963341 },
      NRT: { ianaZone: "Asia/Tokyo", lat: 35.76858, lng: 140.388714 },
    });
  });
});
