import { NextResponse } from "next/server";
import { audit, getRide, putRide } from "@/lib/store";
import type { CancelledBy, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "EXPIRED"]);

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  const by: CancelledBy = body.by ?? "PASSENGER";
  const reason: string | null = body.reason ?? null;
  const role: Role = by === "PASSENGER" ? "PASSENGER" : by === "DRIVER" ? "DRIVER" : "ADMIN";

  const ride = getRide(params.id);
  if (!ride) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (TERMINAL.has(ride.status)) {
    return NextResponse.json({ error: "already_terminal" }, { status: 409 });
  }

  ride.status = "CANCELLED";
  ride.cancelledAt = new Date().toISOString();
  ride.cancelledBy = by;
  ride.cancellationReason = reason;
  putRide(ride);

  audit("ride.cancel", "ride", ride.id, {
    id: by === "PASSENGER" ? ride.passengerId : ride.driverId,
    role,
  });
  return NextResponse.json({ ride });
}
