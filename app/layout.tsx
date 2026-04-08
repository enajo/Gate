import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Expert Gatekeeper",
    template: "%s | Expert Gatekeeper",
  },
  description:
    "A Google-first gated booking platform for professionals.",
  applicationName: "Expert Gatekeeper",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}