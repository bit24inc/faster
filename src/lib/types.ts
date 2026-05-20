// Domain types — mirrors the Prisma schema from the TZ (Part G).
// All money in tetri (1 GEL = 100 tetri). Never floats.

export type Role =
  | "PASSENGER"
  | "DRIVER"
  | "DISPATCHER"
  | "SUPPORT"
  | "ADMIN"
  | "SUPER_ADMIN";

export type Locale = "ka" | "ru" | "en";

export type VehicleCategory = "ECONOMY" | "COMFORT" | "COMFORT_PLUS";

export type RideStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentMethod = "CARD" | "CASH" | "APPLE_PAY" | "GOOGLE_PAY";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "REFUNDED"
  | "FAILED";

export type CancelledBy = "PASSENGER" | "DRIVER" | "SYSTEM";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  label: string;
  point: LatLng;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  category: VehicleCategory;
  isWhite: boolean;
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  rating: number;          // 1.00–5.00
  totalRides: number;
  proSubscription: boolean;
  isOnline: boolean;
  location: LatLng;
  vehicle: Vehicle;
  // Tbilisi Cat A taxi licence
  taxiLicenseNumber: string;
}

export interface Passenger {
  id: string;
  fullName: string;
  phone: string;
  locale: Locale;
  rating: number;
}

export interface FareEstimate {
  category: VehicleCategory;
  distanceMeters: number;
  durationSeconds: number;
  estimatedFareTetri: number;
  platformFeeTetri: number;
  driverPayoutTetri: number;
  commissionRate: number;  // 0.08 base, 0.04 Pro
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId: string | null;
  status: RideStatus;
  category: VehicleCategory;

  pickup: Place;
  dropoff: Place;

  estimatedFareTetri: number;
  finalFareTetri: number | null;
  platformFeeTetri: number | null;
  driverPayoutTetri: number | null;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;

  requestedAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: CancelledBy | null;
  cancellationReason: string | null;

  distanceMeters: number;
  durationSeconds: number;

  // Snapshot for display (driver + vehicle), kept lightweight for prototype.
  driverSnapshot?: {
    fullName: string;
    rating: number;
    vehicle: { make: string; model: string; color: string; plate: string };
  } | null;
}

export interface AuditEntry {
  id: number;
  actorId: string | null;
  actorRole: Role | null;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}
