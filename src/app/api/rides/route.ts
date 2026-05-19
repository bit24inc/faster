import { NextResponse } from "next/server";
import { estimateFare } from "@/lib/pricing";
import {
  activeRideForPassenger,
  audit,
  newId,
  putRide,
} from "@/lib/store";
import type {
  PaymentMethod,
  Ride,
  VehicleCategory,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface CreateRideBody {
  passengerId: string;
  pickup: { label: string; point: { lat: number; lng: number } };
  dropoff: { label: string; point: { lat: number; lng: number } };
  category: VehicleCategory;
  paymentMethod: PaymentMethod;
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateRideBody;
  const { passengerId, pickup, dropoff, category, paymentMethod } = body;

  if (!passengerId || !pickup?.point || !dropoff?.point) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // One active ride per passenger at a time.
  if (activeRideForPassenger(passengerId)) {
    return NextResponse.json(
      { error: "active_ride_exists" },
      { status: 409 },
    );
  }

  const fare = estimateFare(pickup.point, dropoff.point, category);

  const ride: Ride = {
    id: newId("ride"),
    passengerId,
    driverId: null,
    status: "REQUESTED",
    category,
    pickup,
    dropoff,
    estimatedFareTetri: fare.estimatedFareTetri,
    finalFareTetri: null,
    platformFeeTetri: null,
    driverPayoutTetri: null,
    paymentMethod,
    paymentStatus: paymentMethod === "CASH" ? "PENDING" : "AUTHORIZED",
    requestedAt: new Date().toISOString(),
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    distanceMeters: fare.distanceMeters,
    durationSeconds: fare.durationSeconds,
    driverSnapshot: null,
  };

  putRide(ride);
  audit("ride.request", "ride", ride.id, { id: passengerId, role: "PASSENGER" });

  return NextResponse.json({ ride });
}
