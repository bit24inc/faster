import { NextResponse } from "next/server";
import { audit, getRide, putRide, updateDriver } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ride = getRide(params.id);
  if (!ride) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ride.status !== "ASSIGNED") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  ride.status = "ARRIVED";
  ride.arrivedAt = new Date().toISOString();
  putRide(ride);

  // Snap the driver to the pickup location for the mock map.
  if (ride.driverId) {
    updateDriver(ride.driverId, { location: ride.pickup.point });
  }

  audit("ride.arrive", "ride", ride.id, {
    id: ride.driverId,
    role: "DRIVER",
  });
  return NextResponse.json({ ride });
}
