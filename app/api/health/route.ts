import { NextResponse } from "next/server";

// Liveness probe for Docker/Portainer. Deliberately says nothing about which
// integrations are configured — this endpoint is reachable by anyone.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
