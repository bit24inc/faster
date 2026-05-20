import type { FareEstimate, LatLng, VehicleCategory } from "./types";

// Simple Haversine for the prototype's mock map.
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Fare model (tetri, integer):
//   base + perKm * km + perMin * min, clamped to a minimum.
// Numbers are illustrative for the prototype; production values would come
// from config + zone tables (see TZ Part F).
const TARIFF: Record<
  VehicleCategory,
  { baseTetri: number; perKmTetri: number; perMinTetri: number; minTetri: number }
> = {
  ECONOMY:      { baseTetri: 200, perKmTetri: 110, perMinTetri: 20, minTetri: 400 },
  COMFORT:      { baseTetri: 300, perKmTetri: 160, perMinTetri: 28, minTetri: 600 },
  COMFORT_PLUS: { baseTetri: 500, perKmTetri: 240, perMinTetri: 40, minTetri: 1000 },
};

const AVG_SPEED_MPS = 8.33; // ~30 km/h Tbilisi city average

export function estimateFare(
  pickup: LatLng,
  dropoff: LatLng,
  category: VehicleCategory,
  driverProSubscription = false,
): FareEstimate {
  const distanceMeters = haversineMeters(pickup, dropoff);
  // Add a 1.25 route factor to account for non-straight-line city roads.
  const routeMeters = Math.round(distanceMeters * 1.25);
  const durationSeconds = Math.max(60, Math.round(routeMeters / AVG_SPEED_MPS));

  const t = TARIFF[category];
  const km = routeMeters / 1000;
  const minutes = durationSeconds / 60;

  const raw =
    t.baseTetri +
    Math.round(t.perKmTetri * km) +
    Math.round(t.perMinTetri * minutes);
  const estimatedFareTetri = Math.max(t.minTetri, raw);

  const commissionRate = driverProSubscription ? 0.04 : 0.08;
  const platformFeeTetri = Math.round(estimatedFareTetri * commissionRate);
  const driverPayoutTetri = estimatedFareTetri - platformFeeTetri;

  return {
    category,
    distanceMeters: routeMeters,
    durationSeconds,
    estimatedFareTetri,
    platformFeeTetri,
    driverPayoutTetri,
    commissionRate,
  };
}

export function formatGEL(tetri: number, locale: string = "ka-GE"): string {
  const gel = tetri / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "GEL",
      maximumFractionDigits: 2,
    }).format(gel);
  } catch {
    return `${gel.toFixed(2)} GEL`;
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

// "Today" in the Tbilisi timezone, regardless of the runtime's local zone.
// DB stores UTC; UI bucketing must convert. Used by driver earnings and
// admin KPIs to avoid the UTC-midnight rollover bug.
export function tbilisiDateKey(iso: string | null | undefined): string {
  if (!iso) return "";
  // sv-SE gives a YYYY-MM-DD format, and we force the zone explicitly.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function todayInTbilisi(): string {
  return tbilisiDateKey(new Date().toISOString());
}
