import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/icon.svg",
  "/manifest.webmanifest",
]);

const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

const middleware = clerkEnabled
  ? clerkMiddleware((auth, req) => {
      // In local dev, allow all routes so LAN/mobile testing works.
      // (Clerk returnBackUrl can otherwise redirect to localhost, which breaks on phones.)
      if (process.env.NODE_ENV !== "production") return;

      if (!isPublicRoute(req)) auth.protect();
    })
  : () => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    // Run middleware on all routes except next internals and static files
    "/((?!_next|.*\\..*).*)",
  ],
};
