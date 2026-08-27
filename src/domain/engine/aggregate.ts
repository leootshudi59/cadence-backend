export type AggregationMode = "MIN" | "MAX" | "ANY";

// The three group-aggregation modes from PRODUCT.md's "Trois modes
// d'agrégation en groupe": MIN picks the most restrictive value (e.g. the
// lowest per-traveler max-walking limit), MAX picks the widest/latest value
// (e.g. the latest allowed wake-up time so no one is woken too early), and
// ANY is true if at least one traveler is concerned (e.g. wheelchair,
// allergy). Rules combine individual traveler constraints through this one
// helper rather than reimplementing the aggregation logic per rule.
export function aggregateGroupConstraint(
  mode: "MIN" | "MAX",
  values: number[],
): number;
export function aggregateGroupConstraint(
  mode: "ANY",
  values: boolean[],
): boolean;
export function aggregateGroupConstraint(
  mode: AggregationMode,
  values: number[] | boolean[],
): number | boolean {
  switch (mode) {
    case "MIN":
      return Math.min(...(values as number[]));
    case "MAX":
      return Math.max(...(values as number[]));
    case "ANY":
      return (values as boolean[]).some(Boolean);
  }
}
