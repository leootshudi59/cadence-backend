import type { Instant } from "./instant";

export function formatInZone(
  instant: Instant,
  ianaZone: string,
  format = "yyyy-MM-dd HH:mm",
): string {
  return instant.setZone(ianaZone).toFormat(format);
}
