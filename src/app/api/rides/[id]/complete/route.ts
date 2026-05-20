import { NextResponse } from "next/server";
import {
  audit,
  getDriver,
  getRide,
  putRide,
  updateDriver,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ride = getRide(params.id);
  if (!ride) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ride.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  ride.status = "COMPLETED";
  ride.completedAt = new Date().toISOString();
  ride.finalFareTetri = ride.estimatedFareTetri; // prototype: final == estimated
  ride.paymentStatus =
    ride.paymentMethod === "CASH" ? "PENDING" : "CAPTURED";
  putRide(ride);

  // Move driver to dropoff + bump counters.
  if (ride.driverId) {
    const driver = getDriver(ride.driverId);
    if (driver) {
      updateDriver(driver.id, {
        location: ride.dropoff.point,
        totalRides: driver.totalRides + 1,
      });
    }
  }

  audit("ride.complete", "ride", ride.id, {
    id: ride.driverId,
    role: "DRIVER",
  });
  return NextResponse.json({ ride });
}
