import { randomUUID } from "crypto";
import type {
  AuditEntry,
  Driver,
  Passenger,
  Ride,
  RideStatus,
  Role,
} from "./types";

// Process-wide singleton state. In Next.js dev with HMR the module can be
// re-evaluated; we pin it to globalThis so passenger and driver tabs share it.

declare global {
  // eslint-disable-next-line no-var
  var __faster_store: StoreState | undefined;
}

interface StoreState {
  drivers: Map<string, Driver>;
  passengers: Map<string, Passenger>;
  rides: Map<string, Ride>;
  audit: AuditEntry[];
  nextAuditId: number;
  startedAt: string;
}

function seed(): StoreState {
  const passenger: Passenger = {
    id: "pax-1",
    fullName: "Nino Beridze",
    phone: "+995 555 11 22 33",
    locale: "ka",
    rating: 4.92,
  };

  const drivers: Driver[] = [
    {
      id: "drv-1",
      fullName: "Giorgi Kapanadze",
      phone: "+995 555 12 34 56",
      rating: 4.91,
      totalRides: 1842,
      proSubscription: true,
      isOnline: true,
      location: { lat: 41.6960, lng: 44.7900 }, // central
      taxiLicenseNumber: "TB-A-002145",
      vehicle: {
        id: "veh-1",
        make: "Toyota",
        model: "Prius",
        year: 2019,
        color: "White",
        plateNumber: "AA-001-AA",
        category: "ECONOMY",
        isWhite: true,
      },
    },
    {
      id: "drv-2",
      fullName: "Mariam Tsintsadze",
      phone: "+995 555 65 43 21",
      rating: 4.88,
      totalRides: 904,
      proSubscription: false,
      isOnline: true,
      location: { lat: 41.7180, lng: 44.7680 }, // Saburtalo
      taxiLicenseNumber: "TB-A-007781",
      vehicle: {
        id: "veh-2",
        make: "Hyundai",
        model: "Sonata",
        year: 2021,
        color: "White",
        plateNumber: "BB-202-BB",
        category: "COMFORT",
        isWhite: true,
      },
    },
    {
      id: "drv-3",
      fullName: "Davit Lomidze",
      phone: "+995 555 77 88 99",
      rating: 4.96,
      totalRides: 3210,
      proSubscription: true,
      isOnline: false,
      location: { lat: 41.7330, lng: 44.7880 }, // Didube
      taxiLicenseNumber: "TB-A-010044",
      vehicle: {
        id: "veh-3",
        make: "Mercedes-Benz",
        model: "E-Class",
        year: 2022,
        color: "White",
        plateNumber: "CC-333-CC",
        category: "COMFORT_PLUS",
        isWhite: true,
      },
    },
  ];

  return {
    drivers: new Map(drivers.map((d) => [d.id, d])),
    passengers: new Map([[passenger.id, passenger]]),
    rides: new Map(),
    audit: [],
    nextAuditId: 1,
    startedAt: new Date().toISOString(),
  };
}

export function store(): StoreState {
  if (!globalThis.__faster_store) {
    globalThis.__faster_store = seed();
  }
  return globalThis.__faster_store;
}

export function resetStore() {
  globalThis.__faster_store = seed();
}

export function audit(
  action: string,
  targetType: string,
  targetId: string | null,
  actor: { id: string | null; role: Role | null },
) {
  const s = store();
  s.audit.unshift({
    id: s.nextAuditId++,
    actorId: actor.id,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    createdAt: new Date().toISOString(),
  });
  // Cap audit log size in-memory for prototype.
  if (s.audit.length > 200) s.audit.length = 200;
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function listDrivers(): Driver[] {
  return [...store().drivers.values()];
}

export function getDriver(id: string): Driver | undefined {
  return store().drivers.get(id);
}

export function updateDriver(id: string, patch: Partial<Driver>): Driver | undefined {
  const d = store().drivers.get(id);
  if (!d) return undefined;
  const next = { ...d, ...patch };
  store().drivers.set(id, next);
  return next;
}

export function listRides(): Ride[] {
  return [...store().rides.values()].sort((a, b) =>
    b.requestedAt.localeCompare(a.requestedAt),
  );
}

export function getRide(id: string): Ride | undefined {
  return store().rides.get(id);
}

export function putRide(r: Ride) {
  store().rides.set(r.id, r);
}

export function activeRideForPassenger(passengerId: string): Ride | undefined {
  const active: RideStatus[] = ["REQUESTED", "ASSIGNED", "ARRIVED", "IN_PROGRESS"];
  return listRides().find(
    (r) => r.passengerId === passengerId && active.includes(r.status),
  );
}

export function activeRideForDriver(driverId: string): Ride | undefined {
  const active: RideStatus[] = ["ASSIGNED", "ARRIVED", "IN_PROGRESS"];
  return listRides().find(
    (r) => r.driverId === driverId && active.includes(r.status),
  );
}

export function pendingRequestsForDriver(driverId: string): Ride[] {
  // For the prototype, every online driver sees REQUESTED rides whose
  // pickup is within ~6 km of them. Production: H3 cell match + ranking.
  const driver = getDriver(driverId);
  if (!driver || !driver.isOnline) return [];
  return listRides().filter((r) => r.status === "REQUESTED");
}
