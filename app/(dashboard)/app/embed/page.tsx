import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { profileRepository } from "@/server/repositories/profile.repository";
import { EmbedSnippetBuilder } from "@/components/dashboard/embed-snippet-builder";

export default async function EmbedPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const professional = await profileRepository.findByUserId(session.user.id);
  if (!professional) redirect("/onboarding");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const isPublished = Boolean(professional.publishedAt);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.16),transparent_30%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_44%,#F3EDE2_100%)] text-ink">
      <div className="mx-auto max-w-3xl px-4 py-10">

        {/* Header */}
        <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
          Embed
        </p>
        <h1 className="mt-3 text-[36px] font-semibold leading-none tracking-[-0.05em]">
          Booking widget
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-gray-500">
          Paste one snippet on your own website to add a booking button that
          opens your gate in a popup — same qualification flow, same
          calendar, no redirect away from your site.
        </p>

        {!isPublished && (
          <div className="mt-6 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
            Publish your gate before embedding it — the widget loads your live
            public page, which only exists once published.
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-warm-border-soft bg-white/60 p-6 shadow-warm-sm sm:p-8">
          <EmbedSnippetBuilder slug={professional.slug} baseUrl={baseUrl} />
        </div>

      </div>
    </main>
  );
}
