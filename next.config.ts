import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy
// - 'unsafe-inline' on style-src: required by Tailwind CSS (runtime class injection)
// - 'unsafe-eval' on script-src (dev only): required by Next.js HMR / Turbopack
// - accounts.google.com: Google OAuth redirect target
// - Sentry traffic is proxied through /api/monitoring (tunnelRoute) so no
//   external *.sentry.io entries are needed in connect-src.
// frameAncestors is parameterized: everywhere in the app forbids being
// iframed ('none') except /embed/[slug], which exists specifically to be
// iframed from a professional's own website (the embeddable booking widget).
function buildCsp(frameAncestors: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://images.unsplash.com`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `frame-src 'none'`,
    `frame-ancestors ${frameAncestors}`,
    `form-action 'self' https://accounts.google.com`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ]
    .join("; ")
    .trim();
}

const securityHeaders = [
  // Prevent clickjacking — no iframing this app
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers guessing MIME types (script injection via image upload etc.)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Force HTTPS for 1 year once visited (includeSubDomains for safety)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Don't send the full URL as referrer to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features the app doesn't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Tell browsers not to expose this as an XSS vector
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // CSP
  { key: "Content-Security-Policy", value: buildCsp("'none'") },
];

// Deliberately no X-Frame-Options here — this route is meant to be iframed
// from arbitrary third-party sites via the embeddable booking widget
// (public/embed.js), and XFO has no wildcard "allow any origin" value.
// Per the CSP spec, frame-ancestors supersedes X-Frame-Options wherever a
// policy defines it, so this route is still fully governed by CSP below —
// nothing here weakens the DENY every other route gets.
const embedSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Content-Security-Policy", value: buildCsp("*") },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Every route except /embed/* — kept mutually exclusive with the
        // rule below so there's no ambiguity about which CSP applies.
        source: "/:path((?!embed/).*)",
        headers: securityHeaders,
      },
      {
        source: "/embed/:path*",
        headers: embedSecurityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Proxy Sentry traffic through our own origin — avoids ad-blocker drops
  // and keeps connect-src in CSP clean (no external *.sentry.io needed).
  tunnelRoute: "/api/monitoring",

  // Upload source maps during build so Sentry shows readable stack traces,
  // but delete the .map files afterwards so they're never served publicly.
  // Source-map upload requires SENTRY_AUTH_TOKEN; skip silently if not set.
  sourcemaps: {
    filesToDeleteAfterUpload: [".next/static/**/*.map"],
  },
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Tree-shake Sentry's debug logger from production builds.
  disableLogger: true,

  // Only print Sentry build output in CI to keep local builds quiet.
  silent: !process.env.CI,

  automaticVercelMonitors: false,
});
