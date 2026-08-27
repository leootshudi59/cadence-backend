export interface AirportReference {
  readonly city: string;
  readonly country: string;
  readonly ianaZone: string;
  readonly name: string;
}

export const AIRPORTS_BY_IATA = {
  AMS: {
    city: "Amsterdam",
    country: "NL",
    ianaZone: "Europe/Amsterdam",
    name: "Amsterdam Schiphol",
  },
  BCN: {
    city: "Barcelona",
    country: "ES",
    ianaZone: "Europe/Madrid",
    name: "Barcelona-El Prat",
  },
  CDG: {
    city: "Paris",
    country: "FR",
    ianaZone: "Europe/Paris",
    name: "Paris Charles de Gaulle",
  },
  FCO: {
    city: "Rome",
    country: "IT",
    ianaZone: "Europe/Rome",
    name: "Rome Fiumicino",
  },
  HEL: {
    city: "Helsinki",
    country: "FI",
    ianaZone: "Europe/Helsinki",
    name: "Helsinki-Vantaa",
  },
  HND: {
    city: "Tokyo",
    country: "JP",
    ianaZone: "Asia/Tokyo",
    name: "Tokyo Haneda",
  },
  JFK: {
    city: "New York",
    country: "US",
    ianaZone: "America/New_York",
    name: "New York JFK",
  },
  KIX: {
    city: "Osaka",
    country: "JP",
    ianaZone: "Asia/Tokyo",
    name: "Osaka Kansai",
  },
  LHR: {
    city: "London",
    country: "GB",
    ianaZone: "Europe/London",
    name: "London Heathrow",
  },
  LIS: {
    city: "Lisbon",
    country: "PT",
    ianaZone: "Europe/Lisbon",
    name: "Lisbon Humberto Delgado",
  },
  MAD: {
    city: "Madrid",
    country: "ES",
    ianaZone: "Europe/Madrid",
    name: "Madrid-Barajas",
  },
  NRT: {
    city: "Tokyo",
    country: "JP",
    ianaZone: "Asia/Tokyo",
    name: "Tokyo Narita",
  },
  ORY: {
    city: "Paris",
    country: "FR",
    ianaZone: "Europe/Paris",
    name: "Paris Orly",
  },
} as const satisfies Record<string, AirportReference>;

export type KnownIataCode = keyof typeof AIRPORTS_BY_IATA;

export function isKnownIataCode(value: string): value is KnownIataCode {
  return Object.prototype.hasOwnProperty.call(AIRPORTS_BY_IATA, value);
}
