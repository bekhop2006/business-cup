import { describe, expect, it } from "vitest";
import { distanceMeters } from "@/lib/providers/distance";

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    const point = { lat: 30.2711, lng: -97.7437 };
    expect(distanceMeters(point, point)).toBe(0);
  });

  it("measures one degree along a meridian and along the equator", () => {
    // One degree of arc on a sphere of radius 6,371,008.8 m.
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111_195, -1);
  });

  it("measures half the Earth's circumference between antipodes", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20_015_115, -1);
  });

  it("gives the same distance in both directions", () => {
    const austin = { lat: 30.2711, lng: -97.7437 };
    const north = { lat: 30.3889, lng: -97.7203 };
    expect(distanceMeters(austin, north)).toBeCloseTo(distanceMeters(north, austin), 6);
    expect(distanceMeters(austin, north)).toBeGreaterThan(13_000);
    expect(distanceMeters(austin, north)).toBeLessThan(14_000);
  });
});
