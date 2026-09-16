export const NORMALIZED_PLACE_CATEGORIES = [
  "AIRPORT",
  "STATION",
  "PORT",
  "HOTEL",
  "RESTAURANT",
  "MUSEUM",
  "ATTRACTION",
  "OTHER",
] as const;

export type NormalizedPlaceCategory =
  (typeof NORMALIZED_PLACE_CATEGORIES)[number];

export interface NormalizedPlaceSource {
  readonly dataSourceCode: string;
  readonly externalId: string;
  readonly externalCode: string | null;
  readonly rawData: Readonly<Record<string, string>>;
}

/** Provider-independent input for the future privileged reference-data import. */
export interface NormalizedPlace {
  readonly name: string;
  readonly category: NormalizedPlaceCategory;
  readonly address: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly ianaZone: string;
  readonly iataCode: string | null;
  readonly source: NormalizedPlaceSource;
}
