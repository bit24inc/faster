import { NextResponse } from "next/server";
import { audit, getRide, putRide } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ride = getRide(params.id);
  if (!ride) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ride.status !== "ARRIVED") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }
  ride.status = "IN_PROGRESS";
  ride.startedAt = new Date().toISOString();
  putRide(ride);
  audit("ride.start", "ride", ride.id, {
    id: ride.driverId,
    role: "DRIVER",
  });
  return NextResponse.json({ ride });
}
