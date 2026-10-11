import { DateTime } from "luxon";

export type StoredDate = Date;

function requireValid(value: DateTime, context: string): DateTime {
  if (!value.isValid) {
    throw new Error(
      `${context}: ${value.invalidExplanation ?? "invalid date"}`,
    );
  }

  return value;
}

/**
 * Validates that the provided string represents a valid IANA time zone.
 *
 * Luxon attempts to create a DateTime using the supplied zone. If the zone
 * is invalid, requireValid throws an error instead of allowing an invalid
 * timezone to propagate through the application.
 *
 * @param ianaZone IANA time zone identifier to validate, such as "Europe/Paris".
 * @throws Error When the supplied value is not a valid IANA time zone.
 */
export function assertIanaZone(ianaZone: string): void {
  requireValid(
    DateTime.now().setZone(ianaZone),
    `Invalid IANA time zone "${ianaZone}"`,
  );
}

export function localDateTimeToStoredDate(input: {
  local: string;
  ianaZone: string;
}): Date {
  return requireValid(
    DateTime.fromISO(input.local, { zone: input.ianaZone }),
    `Invalid local time "${input.local}" in "${input.ianaZone}"`,
  )
    .toUTC()
    .toJSDate();
}

export function dateOnlyToStoredDate(value: string): Date {
  return requireValid(
    DateTime.fromISO(value, { zone: "UTC" }),
    `Invalid calendar date "${value}"`,
  ).toJSDate();
}

export function timeOnlyToStoredDate(value: string): Date {
  return requireValid(
    DateTime.fromISO(`1970-01-01T${value}`, { zone: "UTC" }),
    `Invalid local time "${value}"`,
  ).toJSDate();
}

export function utcNowStoredDate(): Date {
  return DateTime.utc().toJSDate();
}

export function compareStoredDates(
  left: StoredDate,
  right: StoredDate,
): number {
  return (
    DateTime.fromJSDate(left).toMillis() - DateTime.fromJSDate(right).toMillis()
  );
}

export function storedDateToUtcIso(value: Date): string {
  const result = requireValid(
    DateTime.fromJSDate(value, { zone: "UTC" }),
    "Invalid stored instant",
  ).toISO();

  if (result === null) {
    throw new Error("Could not serialize stored instant");
  }

  return result;
}

export function storedDateToDateOnly(value: Date): string {
  const result = requireValid(
    DateTime.fromJSDate(value, { zone: "UTC" }),
    "Invalid stored calendar date",
  ).toISODate();

  if (result === null) {
    throw new Error("Could not serialize stored calendar date");
  }

  return result;
}

export function storedDateToTimeOnly(value: Date): string {
  return requireValid(
    DateTime.fromJSDate(value, { zone: "UTC" }),
    "Invalid stored local time",
  ).toFormat("HH:mm:ss");
}
