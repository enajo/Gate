import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy
// - 'unsafe-inline' on style-src: required by Tailwind CSS (runtime class injection)
// - 'unsafe-eval' on script-src (dev only): required by Next.js HMR / Turbopack
// - accounts.google.com: Google OAuth redirect target
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://images.unsplash.com`,
  `font-src 'self'`,
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  `frame-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self' https://accounts.google.com`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
]
  .join("; ")
  .trim();

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
  { key: "Content-Security-Policy", value: csp },
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
        // Apply to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
