import type { ReactNode } from "react";
import localFont from "next/font/local";

// Scoped to the marketing route group only — the dashboard and public
// booking pages keep the system font stack unchanged. Self-hosted from
// app/fonts (no runtime Google Fonts request, no CSP concern) — and loaded
// locally rather than via next/font/google, so the build never depends on
// what Google Fonts happens to return (see app/fonts/README.md).
const fraunces = localFont({
  src: "../fonts/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

// Pairs with IBM Plex Sans as a designed-together superfamily — used for
// the retro counter widget and eyebrow tags, where the default system mono
// stack read as "code editor" rather than the intended Y2K-counter voice.
const ibmPlexMono = localFont({
  src: "../fonts/ibm-plex-mono-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      {children}
    </div>
  );
}
