import { describe, expect, it, vi } from "vitest";
import {
  GeoTzTimezoneResolver,
  InvalidCoordinatesError,
  TimezoneResolutionError,
} from "./timezone-resolver";

describe("GeoTzTimezoneResolver", () => {
  it.each([
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
    [-90.1, 0],
    [90.1, 0],
    [0, -180.1],
    [0, 180.1],
  ])("rejects invalid coordinates (%s, %s)", (lat, lng) => {
    const lookup = vi.fn(() => ["Europe/Paris"]);
    const resolver = new GeoTzTimezoneResolver(lookup);

    expect(() => resolver.resolve(lat, lng)).toThrow(InvalidCoordinatesError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("fails instead of falling back when no timezone is found", () => {
    const resolver = new GeoTzTimezoneResolver(() => []);

    expect(() => resolver.resolve(48.86, 2.35)).toThrow(
      TimezoneResolutionError,
    );
  });

  it("rejects multiple distinct timezone candidates", () => {
    const resolver = new GeoTzTimezoneResolver(() => [
      "Asia/Shanghai",
      "Asia/Urumqi",
    ]);

    expect(() => resolver.resolve(43.84, 87.53)).toThrow(
      /Multiple IANA timezones/,
    );
  });

  it("accepts duplicate copies of one candidate", () => {
    const resolver = new GeoTzTimezoneResolver(() => [
      "Europe/Paris",
      "Europe/Paris",
    ]);

    expect(resolver.resolve(48.86, 2.35)).toBe("Europe/Paris");
  });

  it("rejects a non-IANA result", () => {
    const resolver = new GeoTzTimezoneResolver(() => ["Not/A_Zone"]);

    expect(() => resolver.resolve(48.86, 2.35)).toThrow(
      /Invalid IANA timezone/,
    );
  });
});
