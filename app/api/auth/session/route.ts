import { NextResponse } from "next/server";
import { loadValidServerSession } from "@/lib/auth/server/session-api";

export async function GET() {
  const publicSession = await loadValidServerSession();
  if (!publicSession) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    expiresAt: publicSession.expiresAt,
    user: publicSession.user,
    forcePasswordChange: publicSession.user.forcePasswordChange,
  });
}
