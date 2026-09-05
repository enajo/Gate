import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { adminService } from "@/server/services/admin.service";
import { UnpublishButton } from "@/components/admin/unpublish-button";
import { TokenBalanceButton } from "@/components/admin/token-balance-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Admin — Gate" };

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-xl">
      <CardHeader className="space-y-1 p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="text-[28px] font-semibold tabular-nums leading-none text-slate-900">
          {value}
        </p>
        {hint && <p className="text-[12px] text-slate-500">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminPage() {
  const session = await auth();
  if (!isAdmin(session)) notFound();

  const [stats, professionals] = await Promise.all([
    adminService.getPlatformStats(),
    adminService.listProfessionals(),
  ]);

  const rejectedLikeCount =
    (stats.leads.byResult.REJECTED ?? 0) + (stats.leads.byResult.REDIRECTED ?? 0);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
          Gate — Admin
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">
          Platform overview
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Across every professional on Gate — not one dashboard's view.
        </p>

        {/* Top-line stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Professionals"
            value={stats.professionals.total}
            hint={`${stats.professionals.published} published`}
          />
          <StatCard
            label="Leads screened"
            value={stats.leads.total}
            hint={`${stats.leads.byResult.QUALIFIED ?? 0} qualified · ${rejectedLikeCount} rejected/redirected`}
          />
          <StatCard
            label="Corrections logged"
            value={stats.leads.corrected}
            hint="Professional overrode the AI&apos;s call"
          />
          <StatCard
            label="Bookings"
            value={stats.bookings.total}
            hint={`${stats.bookings.confirmed} confirmed`}
          />
          <StatCard
            label="Outcomes: Won"
            value={stats.outcomes.won}
            hint={
              stats.outcomes.totalWonValue > 0
                ? `$${stats.outcomes.totalWonValue.toLocaleString()} total value`
                : "No deal value logged yet"
            }
          />
          <StatCard label="Outcomes: Lost" value={stats.outcomes.lost} />
          <StatCard label="Outcomes: No response" value={stats.outcomes.noResponse} />
          <StatCard
            label="Token balance remaining"
            value={stats.tokenBalanceRemaining.toLocaleString()}
            hint="Summed across all professionals"
          />
        </div>

        {/* Professionals table */}
        <Card className="mt-8 hover:translate-y-0 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">Professionals</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Token balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400">
                      No professionals yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  professionals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-slate-900">
                        <Link
                          href={`/admin/professionals/${p.id}`}
                          className="hover:underline"
                        >
                          {p.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-500">{p.email}</TableCell>
                      <TableCell className="text-slate-500">{p.slug}</TableCell>
                      <TableCell>
                        {p.published ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{p.leadCount}</TableCell>
                      <TableCell
                        className={`tabular-nums ${p.tokenBalance <= 0 ? "text-red-600" : ""}`}
                      >
                        {p.tokenBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(p.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.published && (
                            <UnpublishButton
                              professionalId={p.id}
                              fullName={p.fullName}
                            />
                          )}
                          <TokenBalanceButton
                            professionalId={p.id}
                            fullName={p.fullName}
                            currentBalance={p.tokenBalance}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
