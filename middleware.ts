// Vercel Edge Middleware — gates every route behind HTTP Basic Auth.
//
// Runs before any static asset (HTML, JS, CSS) is served, so an attacker
// can't even pull the app bundle without the password. The password lives
// only in the ADMIN_PASSWORD env var on Vercel; rotate by updating the
// var and redeploying.
//
// Username is hardcoded to "admin". Change ADMIN_USERNAME below if you
// want something else, or lift it to an env var later.
//
// One bypass: `/api/cron/*` accepts `Authorization: Bearer ${CRON_SECRET}`,
// which is what Vercel Cron sends automatically. Manual triggers from the
// admin UI still flow through Basic Auth (the browser carries the
// credentials on same-origin fetches).

import { next } from "@vercel/edge";

export const config = {
  matcher: "/(.*)",
};

const USERNAME = "admin";
const REALM = "juju-admin";

export default function middleware(request: Request): Response {
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);

  // Vercel Cron path: accept Bearer cron secret.
  if (url.pathname.startsWith("/api/cron/")) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && auth === `Bearer ${cronSecret}`) {
      return next();
    }
    // Fall through to Basic Auth so a logged-in admin can still hit the
    // cron endpoints by hand for ad-hoc testing.
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Fail closed: if the env var isn't set, block everything rather than
    // accidentally expose the site because of a config miss.
    return new Response("Admin password not configured.", { status: 500 });
  }

  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const sepIdx = decoded.indexOf(":");
      if (sepIdx > 0) {
        const user = decoded.slice(0, sepIdx);
        const pass = decoded.slice(sepIdx + 1);
        if (user === USERNAME && pass === expected) {
          return next();
        }
      }
    } catch {
      // Malformed base64 — fall through to 401.
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}"`,
    },
  });
}
