import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/icon.svg",
  "/manifest.webmanifest",
]);

export default clerkMiddleware((auth, req) => {
  // In local dev, allow all routes so LAN/mobile testing works.
  // (Clerk returnBackUrl can otherwise redirect to localhost, which breaks on phones.)
  if (process.env.NODE_ENV !== "production") return;

  if (!isPublicRoute(req)) auth.protect();
});

export const config = {
  matcher: [
    // Run middleware on all routes except next internals and static files
    "/((?!_next|.*\\..*).*)",
  ],
};
