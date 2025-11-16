import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true }, { status: 200 });
  // Expire the auth cookie immediately; domain must match what was set on signin.
  res.headers.append(
    "Set-Cookie",
    "cs_auth_session=; Path=/; Max-Age=0; SameSite=Lax" +
      (process.env.CHITTERSYNC_COOKIE_DOMAIN
        ? `; Domain=${process.env.CHITTERSYNC_COOKIE_DOMAIN}`
        : "") +
      (process.env.NODE_ENV === "production" ? "; Secure" : ""),
  );
  return res;
}

