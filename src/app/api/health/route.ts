import { NextResponse } from "next/server";
import { checkHealth } from "@/server/health";

export const dynamic = "force-dynamic";

// Public deployment check: 200 only when the database is reachable and every migration is applied.
export async function GET() {
  const health = await checkHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
