import { NextResponse } from "next/server";
import { audit, resetStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  resetStore();
  audit("demo.reset", "system", null, { id: null, role: "ADMIN" });
  return NextResponse.json({ ok: true });
}
