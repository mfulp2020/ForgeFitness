import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/icon.svg",
  "/manifest.webmanifest",
]);

const handler = clerkMiddleware((auth, req) => {
  // In local dev, allow all routes so LAN/mobile testing works.
  // (Clerk returnBackUrl can otherwise redirect to localhost, which breaks on phones.)
  if (process.env.NODE_ENV !== "production") return;

  if (!isPublicRoute(req)) auth.protect();
});

export function proxy(req: NextRequest, event: NextFetchEvent) {
  return handler(req, event);
}

export const config = {
  matcher: [
    // Run proxy on all routes except next internals and static files
    "/((?!_next|.*\\..*).*)",
  ],
};
