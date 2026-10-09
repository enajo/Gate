import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Scoped to the marketing route group only — the dashboard and public
// booking pages keep the system font stack unchanged. Self-hosted by
// Next.js at build time (no runtime Google Fonts request, no CSP concern).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

// Pairs with IBM Plex Sans as a designed-together superfamily — used for
// the retro counter widget and eyebrow tags, where the default system mono
// stack read as "code editor" rather than the intended Y2K-counter voice.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
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
