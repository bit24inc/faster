import type { Place } from "./types";

// Tbilisi landmarks, used for the prototype's mock pickup/dropoff selectors.
// Coordinates are real (WGS84) so the H3-style nearest-driver math is real.
export const TBILISI_PLACES: Place[] = [
  { label: "Freedom Square / თავისუფლების მოედანი", point: { lat: 41.6938, lng: 44.8015 } },
  { label: "Rustaveli Avenue / რუსთაველის გამზ.",   point: { lat: 41.6987, lng: 44.7997 } },
  { label: "Vake Park / ვაკის პარკი",                point: { lat: 41.7090, lng: 44.7610 } },
  { label: "Saburtalo / საბურთალო",                  point: { lat: 41.7270, lng: 44.7600 } },
  { label: "Didube Bus Station / დიდუბე",            point: { lat: 41.7430, lng: 44.7860 } },
  { label: "Tbilisi Airport / აეროპორტი",            point: { lat: 41.6691, lng: 44.9547 } },
  { label: "Old Town / ძველი თბილისი",               point: { lat: 41.6890, lng: 44.8090 } },
  { label: "Tbilisi Mall / თბილისი მოლი",            point: { lat: 41.8240, lng: 44.7920 } },
  { label: "Marjanishvili / მარჯანიშვილი",           point: { lat: 41.7080, lng: 44.7980 } },
  { label: "Isani / ისანი",                          point: { lat: 41.6810, lng: 44.8340 } },
];

// Bounding box used to project lat/lng → SVG x/y for the mock map.
export const TBILISI_BOUNDS = {
  minLat: 41.65,
  maxLat: 41.84,
  minLng: 44.74,
  maxLng: 44.97,
};

export function project(point: { lat: number; lng: number }, w: number, h: number) {
  const { minLat, maxLat, minLng, maxLng } = TBILISI_BOUNDS;
  const x = ((point.lng - minLng) / (maxLng - minLng)) * w;
  // SVG y axis grows downward → invert lat
  const y = (1 - (point.lat - minLat) / (maxLat - minLat)) * h;
  return { x, y };
}
