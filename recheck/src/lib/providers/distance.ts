import type { LatLng } from "./types";

// Mean Earth radius (IUGG).
const EARTH_RADIUS_METERS = 6_371_008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Great-circle distance between two points, in meters (haversine formula).
export function distanceMeters(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}
