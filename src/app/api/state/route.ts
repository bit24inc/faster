import { NextResponse } from "next/server";
import { listDrivers, listRides, store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = store();
  return NextResponse.json({
    drivers: listDrivers(),
    rides: listRides(),
    audit: s.audit.slice(0, 50),
    startedAt: s.startedAt,
  });
}
