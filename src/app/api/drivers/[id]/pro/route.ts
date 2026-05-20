import { NextResponse } from "next/server";
import { audit, getDriver, updateDriver } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  const proSubscription: boolean = !!body.proSubscription;
  const driver = getDriver(params.id);
  if (!driver) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const updated = updateDriver(driver.id, { proSubscription });
  audit(
    proSubscription ? "driver.pro.enable" : "driver.pro.disable",
    "driver",
    driver.id,
    { id: driver.id, role: "DRIVER" },
  );
  return NextResponse.json({ driver: updated });
}
