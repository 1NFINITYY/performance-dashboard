import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add performance timing header
  response.headers.set("X-Response-Time", Date.now().toString());

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
