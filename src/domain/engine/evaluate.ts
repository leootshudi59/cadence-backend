import type { Instant } from "../time";
import type { Violation } from "./types";

// Trip/bookings/travelers land once the Phase 1 schema exists. `now` is
// captured by the caller via time.now() and passed in here, never read
// from the clock inside the engine, so evaluateTrip stays pure and
// deterministic (same ctx in -> same violations out, always).
export type TripContext = {
  now: Instant;
};

export function evaluateTrip(ctx: TripContext): Violation[] {
  void ctx;
  return [];
}
