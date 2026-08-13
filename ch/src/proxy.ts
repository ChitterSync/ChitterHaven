import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const authorization = request.headers.get("authorization") || "";
  const maintenanceToken = request.headers.get("x-maintenance-token");
  if (authorization.startsWith("Bearer ") || maintenanceToken) return NextResponse.next();

  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const expectedHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  if (origin) {
    try {
      if (new URL(origin).host === expectedHost) return NextResponse.next();
    } catch {}
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  if (request.headers.get("sec-fetch-site") === "same-origin") return NextResponse.next();
  return NextResponse.json({ error: "Request origin could not be verified" }, { status: 403 });
}

export const config = {
  matcher: "/api/:path*",
};
