import { NextResponse } from "next/server";
import { estimateFare } from "@/lib/pricing";
import {
  activeRideForDriver,
  audit,
  getDriver,
  getRide,
  putRide,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  const driverId: string | undefined = body.driverId;
  if (!driverId) {
    return NextResponse.json({ error: "driver_required" }, { status: 400 });
  }

  const driver = getDriver(driverId);
  if (!driver) return NextResponse.json({ error: "driver_not_found" }, { status: 404 });
  if (!driver.isOnline) return NextResponse.json({ error: "driver_offline" }, { status: 422 });
  if (activeRideForDriver(driverId)) {
    return NextResponse.json({ error: "driver_busy" }, { status: 409 });
  }

  const ride = getRide(params.id);
  if (!ride) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ride.status !== "REQUESTED") {
    return NextResponse.json({ error: "ride_not_available" }, { status: 409 });
  }

  // Recompute commission for the accepting driver's Pro tier.
  const fare = estimateFare(
    ride.pickup.point,
    ride.dropoff.point,
    ride.category,
    driver.proSubscription,
  );

  ride.driverId = driver.id;
  ride.status = "ASSIGNED";
  ride.acceptedAt = new Date().toISOString();
  ride.platformFeeTetri = fare.platformFeeTetri;
  ride.driverPayoutTetri = fare.driverPayoutTetri;
  ride.driverSnapshot = {
    fullName: driver.fullName,
    rating: driver.rating,
    vehicle: {
      make: driver.vehicle.make,
      model: driver.vehicle.model,
      color: driver.vehicle.color,
      plate: driver.vehicle.plateNumber,
    },
  };
  putRide(ride);

  audit("ride.accept", "ride", ride.id, { id: driver.id, role: "DRIVER" });

  return NextResponse.json({ ride });
}
