import { describe, expect, it } from "vitest";
import { aggregateGroupConstraint } from "./aggregate";

describe("aggregateGroupConstraint", () => {
  // Three travelers with conflicting constraints: a 4-year-old who tires
  // fast, a wheelchair user, and an adult with no particular limits.
  const travelers = [
    { maxWalkKm: 6, earliestWake: 8, usesWheelchair: false },
    { maxWalkKm: 12, earliestWake: 7, usesWheelchair: true },
    { maxWalkKm: 9, earliestWake: 9, usesWheelchair: false },
  ];

  it("MIN picks the most restrictive value (lowest max-walking limit)", () => {
    const result = aggregateGroupConstraint(
      "MIN",
      travelers.map((t) => t.maxWalkKm),
    );
    expect(result).toBe(6);
  });

  it("MAX picks the widest value (latest allowed wake-up time)", () => {
    const result = aggregateGroupConstraint(
      "MAX",
      travelers.map((t) => t.earliestWake),
    );
    expect(result).toBe(9);
  });

  it("ANY is true when at least one traveler is concerned", () => {
    const result = aggregateGroupConstraint(
      "ANY",
      travelers.map((t) => t.usesWheelchair),
    );
    expect(result).toBe(true);
  });

  it("ANY is false when no traveler is concerned", () => {
    const result = aggregateGroupConstraint(
      "ANY",
      travelers.map(() => false),
    );
    expect(result).toBe(false);
  });
});
