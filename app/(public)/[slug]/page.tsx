import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublicSalesPageTemplate } from "@/components/public-page/public-sales-page-template";
import { profileService } from "@/server/services/profile.service";
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await profileService.getPublicProfileBySlug(slug);

  if (!profile) return { title: "Not Found" };

  return {
    title: `${profile.fullName} — Gate`,
    description: profile.headline ?? profile.bio ?? undefined,
    openGraph: {
      title: `${profile.fullName} — Gate`,
      description: profile.headline ?? profile.bio ?? undefined,
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicProfessionalPage({
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
      utmSource: utm_source,
      utmMedium: utm_medium,
      utmCampaign: utm_campaign,
    },
    service,
  );
  if (!pageData) notFound();

  return <PublicSalesPageTemplate data={pageData} />;
}
