import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { resolvePublicOrigin } from "@/lib/auth/server/public-origin";
import { getSessionOptions, hasBffSessionAuth, type BffSessionData } from "@/lib/auth/server/session-options";

const SESSION_IDLE_MS = Number(process.env.SESSION_IDLE_MS ?? "600000");
const SESSION_ABSOLUTE_MS = Number(process.env.SESSION_ABSOLUTE_MS ?? "28800000");

function isSessionIdleExpired(session: BffSessionData): boolean {
  if (!session.lastActivityAt) return false;
  return Date.now() - session.lastActivityAt > SESSION_IDLE_MS;
}

function isSessionAbsoluteExpired(session: BffSessionData): boolean {
  if (!session.sessionStartedAt) return false;
  return Date.now() - session.sessionStartedAt > SESSION_ABSOLUTE_MS;
}

const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/api/auth", "/_next", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicOrigin = resolvePublicOrigin(request.headers);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<BffSessionData>(request, response, getSessionOptions());

  if (!hasBffSessionAuth(session)) {
    const login = new URL("/login", publicOrigin);
    login.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(login);
  }

  if (isSessionIdleExpired(session) || isSessionAbsoluteExpired(session)) {
    session.sid = undefined;
    session.user = undefined;
    await session.save();
    const login = new URL("/login", publicOrigin);
    login.searchParams.set("reason", "session-expired");
    return NextResponse.redirect(login);
  }

  session.lastActivityAt = Date.now();
  await session.save();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
