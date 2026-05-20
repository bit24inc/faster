import { NextResponse } from "next/server";
import { estimateFare } from "@/lib/pricing";
import type { VehicleCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { pickup, dropoff } = body ?? {};
  if (
    !pickup || !dropoff ||
    typeof pickup.lat !== "number" || typeof pickup.lng !== "number" ||
    typeof dropoff.lat !== "number" || typeof dropoff.lng !== "number"
  ) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const categories: VehicleCategory[] = ["ECONOMY", "COMFORT", "COMFORT_PLUS"];
  const estimates = categories.map((c) => estimateFare(pickup, dropoff, c));
  return NextResponse.json({ estimates });
}
