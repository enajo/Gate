import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { LeadsTable, type LeadRow } from "@/components/dashboard/leads-table";

// ── Constants ─────────────────────────────────────────────────────────────────

const RESULT_FILTERS = ["QUALIFIED", "REDIRECTED", "REJECTED"] as const;
type ResultFilter = (typeof RESULT_FILTERS)[number] | "ALL";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const professional = await profileRepository.findByUserId(session.user.id);
  if (!professional) redirect("/onboarding");

  const { result } = await searchParams;
  const activeFilter: ResultFilter =
    result && RESULT_FILTERS.includes(result as (typeof RESULT_FILTERS)[number])
      ? (result as ResultFilter)
      : "ALL";

  // Fetch everything once — counts are derived in-memory
  const allLeads = await bookingRepository.findLeadsWithServiceByProfessionalId(
    professional.id,
  );

  const counts = {
    ALL: allLeads.length,
    QUALIFIED: allLeads.filter((l) => l.qualificationResult === "QUALIFIED").length,
    REDIRECTED: allLeads.filter((l) => l.qualificationResult === "REDIRECTED").length,
    REJECTED: allLeads.filter((l) => l.qualificationResult === "REJECTED").length,
  };

  const filtered =
    activeFilter === "ALL"
      ? allLeads
      : allLeads.filter((l) => l.qualificationResult === activeFilter);

  // Group the full (unfiltered) list by email so repeat contacts show their
  // whole history even when the current filter tab would otherwise hide it.
  const leadsByEmail = new Map<string, typeof allLeads>();
  for (const lead of allLeads) {
    const key = lead.email.trim().toLowerCase();
    const existing = leadsByEmail.get(key);
    if (existing) {
      existing.push(lead);
    } else {
      leadsByEmail.set(key, [lead]);
    }
  }

  const tableLeads: LeadRow[] = filtered.map((l) => {
    const sameEmail = leadsByEmail.get(l.email.trim().toLowerCase()) ?? [];
    const priorVisits = sameEmail
      .filter((other) => other.id !== l.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((other) => ({
        id: other.id,
        createdAt: other.createdAt,
        serviceTitle: other.service.title,
        qualificationResult: other.qualificationResult as LeadRow["qualificationResult"],
        outcome: other.outcome,
      }));

    return {
      id: l.id,
      name: l.name,
      email: l.email,
      qualificationResult: l.qualificationResult as LeadRow["qualificationResult"],
      service: { title: l.service.title },
      answersJson: l.answersJson,
      referrer: l.referrer,
      utmSource: l.utmSource,
      correctedResult: l.correctedResult as LeadRow["correctedResult"],
      correctionNote: l.correctionNote,
      createdAt: l.createdAt,
      visits: l.visits.map((v) => ({
        id: v.id,
        referrer: v.referrer,
        utmSource: v.utmSource,
        landingPath: v.landingPath,
        createdAt: v.createdAt,
      })),
      priorVisits,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.16),transparent_30%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_44%,#F3EDE2_100%)] text-ink">
      <div className="mx-auto max-w-4xl px-4 py-10">

        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
              Leads
            </p>
            <h1 className="mt-3 text-[36px] font-semibold leading-none tracking-[-0.05em]">
              Qualification Inbox
            </h1>
            <p className="mt-3 text-[14px] leading-7 text-gray-500">
              Every visitor who went through your AI gate — their conversation
              and outcome.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[36px] font-semibold tracking-[-0.05em] tabular-nums">
              {counts.ALL}
            </p>
            <p className="text-[12px] uppercase tracking-[0.14em] text-gray-400">
              total leads
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {(["ALL", ...RESULT_FILTERS] as const).map((f) => {
            const isActive = activeFilter === f;
            const count = counts[f];
            const href = f === "ALL" ? "/app/leads" : `/app/leads?result=${f}`;

            return (
              <Link
                key={f}
                href={href}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition ${
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-warm-border-soft bg-white/60 text-gray-600 hover:border-ink/40 hover:text-ink"
                }`}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums ${
                    isActive ? "bg-white/20" : "bg-warm-border-soft text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-warm-border-soft bg-white/60 shadow-warm-sm">
          <LeadsTable leads={tableLeads} />
        </div>

      </div>
    </main>
  );
}
