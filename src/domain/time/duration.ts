import type { Duration } from "luxon";
import type { Instant } from "./instant";

export function durationBetween(start: Instant, end: Instant): Duration {
  return end.diff(start);
}
