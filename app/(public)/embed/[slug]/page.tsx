import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { EmbedHeightReporter } from "@/components/embed/embed-height-reporter";
import { PublicSalesPageTemplate } from "@/components/public-page/public-sales-page-template";
import { getPublicSalesPageData } from "@/server/services/public-sales-page.service";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    service?: string;
  }>;
};

// ── Metadata ──────────────────────────────────────────────────────────────────

// Same content lives at /[slug] — keep search engines pointed there, not here.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Iframe target for the embeddable booking widget (see public/embed.js).
 * Identical rendering to /[slug] — the only difference is this path gets
 * relaxed frame-ancestors headers (next.config.ts) so a professional's own
 * website can embed it, which /[slug] deliberately does not get.
 */
export default async function EmbedProfessionalPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { utm_source, utm_medium, utm_campaign, service } = await searchParams;
  const referrer = (await headers()).get("referer");

  const pageData = await getPublicSalesPageData(
    slug,
    {
      referrer,
      utmSource: utm_source ?? "embed",
      utmMedium: utm_medium,
      utmCampaign: utm_campaign,
    },
    service,
  );
  if (!pageData) notFound();

  return (
    <>
      <EmbedHeightReporter />
      <PublicSalesPageTemplate data={pageData} />
    </>
  );
}
