import { NextResponse } from "next/server";
import { serverAuthConfig } from "@/lib/auth/server/config";
import { requireAccessToken } from "@/lib/auth/server/session-api";

async function proxy(request: Request, pathSegments: string[]) {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return NextResponse.json({ title: "Unauthorized", detail: "Session expired" }, { status: 401 });
  }

  const incoming = new URL(request.url);
  const target = new URL(
    `${serverAuthConfig.apiBaseUrl}/${pathSegments.join("/")}${incoming.search}`,
  );

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.set("Authorization", `Bearer ${accessToken}`);

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
