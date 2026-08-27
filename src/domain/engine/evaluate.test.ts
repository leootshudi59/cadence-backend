import { describe, expect, it } from "vitest";
import { createInstant } from "../time";
import { evaluateTrip } from "./evaluate";

describe("evaluateTrip", () => {
  it("returns no violations for an empty context", () => {
    const ctx = {
      now: createInstant({
        local: "2026-08-18T10:00:00",
        ianaZone: "Europe/Paris",
      }),
    };

    expect(evaluateTrip(ctx)).toEqual([]);
  });
});
