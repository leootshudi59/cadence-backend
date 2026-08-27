import { DateTime } from "luxon";

export type Instant = DateTime;

export function createInstant(input: {
  local: string;
  ianaZone: string;
}): Instant {
  const instant = DateTime.fromISO(input.local, { zone: input.ianaZone });
  if (!instant.isValid) {
    throw new Error(
      `Invalid instant "${input.local}" in zone "${input.ianaZone}": ${instant.invalidExplanation}`,
    );
  }
  return instant;
}

export function now(ianaZone: string): Instant {
  const instant = DateTime.now().setZone(ianaZone);
  if (!instant.isValid) {
    throw new Error(
      `Invalid zone "${ianaZone}": ${instant.invalidExplanation}`,
    );
  }
  return instant;
}
