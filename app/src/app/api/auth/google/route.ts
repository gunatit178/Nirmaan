import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_COOKIE, googleConfigured, startSignIn } from "@/lib/auth/google";

/** GET /api/auth/google: off to Google's account chooser. */
export function GET(request: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google-off", request.url));
  const next = request.nextUrl.searchParams.get("next") ?? "";
  const { url, cookie } = startSignIn(request.nextUrl.origin, next);
  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent on Google's top-level redirect back to us
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
