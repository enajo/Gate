import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { adminService } from "@/server/services/admin.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Professional — Admin — Gate" };

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

const RESULT_TONE: Record<string, "success" | "warning" | "destructive"> = {
  QUALIFIED: "success",
  REDIRECTED: "warning",
  REJECTED: "destructive",
};

export default async function AdminProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!isAdmin(session)) notFound();

  const { id } = await params;
  const professional = await adminService.getProfessionalDetail(id);
  if (!professional) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" />
          Back to platform overview
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Gate — Admin
            </p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">
              {professional.fullName}
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              {professional.email} · /{professional.slug}
            </p>
          </div>

          <Badge variant={professional.published ? "success" : "secondary"}>
            {professional.published ? "Published" : "Unpublished"}
          </Badge>
        </div>

        {/* Profile fields */}
        <Card className="mt-8 hover:translate-y-0 hover:shadow-xl">
          <CardContent className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Title" value={professional.title ?? "—"} />
            <Field label="Industry" value={professional.industry ?? "—"} />
            <Field label="Timezone" value={professional.timezone} />
            <Field label="Plan tier" value={professional.planTier} />
            <Field
              label="Token balance"
              value={professional.tokenBalance.toLocaleString()}
            />
            <Field
              label="Tokens reset"
              value={formatDate(professional.tokenBalanceResetAt)}
            />
            <Field label="Joined" value={formatDate(professional.createdAt)} />
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="mt-6 hover:translate-y-0 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">
              Services ({professional.services.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Gate requirements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professional.services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">
                      No services yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  professional.services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-slate-900">
                        {s.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.active ? "success" : "secondary"}>
                          {s.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {s.durationMinutes} min
                      </TableCell>
                      <TableCell>
                        {s.displayPrice ? `${s.currency ?? ""}${s.displayPrice}` : "—"}
                      </TableCell>
                      <TableCell className="text-[12px] text-slate-500">
                        {[
                          s.qualificationRequired && "Qualification",
                          s.accessCodeRequired && "Access code",
                          s.paymentRequired && "Payment",
                          s.manualApprovalRequired && "Manual approval",
                        ]
                          .filter(Boolean)
                          .join(", ") || "None"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Calendar accounts */}
        <Card className="mt-6 hover:translate-y-0 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">
              Calendar accounts ({professional.calendarAccounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Account email</TableHead>
                  <TableHead>Sync status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professional.calendarAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">
                      No calendar connected.
                    </TableCell>
                  </TableRow>
                ) : (
                  professional.calendarAccounts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-slate-900">
                        {c.provider}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {c.providerEmail ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.syncStatus === "SYNCED"
                              ? "success"
                              : c.syncStatus === "ERROR"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {c.syncStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-slate-500">
                        {c.lastSyncedAt ? formatDateTime(c.lastSyncedAt) : "Never"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card className="mt-6 hover:translate-y-0 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">
              Recent leads (last {professional.recentLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professional.recentLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">
                      No leads yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  professional.recentLeads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-slate-900">
                        {l.name}
                        <span className="block text-[12px] font-normal text-slate-400">
                          {l.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {l.serviceTitle}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={RESULT_TONE[l.qualificationResult] ?? "secondary"}>
                            {l.qualificationResult}
                          </Badge>
                          {l.correctedResult && (
                            <span className="text-[11px] text-slate-400">
                              Corrected to {l.correctedResult}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {l.outcome ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(l.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent bookings */}
        <Card className="mt-6 hover:translate-y-0 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">
              Recent bookings (last {professional.recentBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calendar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professional.recentBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">
                      No bookings yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  professional.recentBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-slate-900">
                        {b.leadName}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {b.serviceTitle}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDateTime(b.slotStart)}
                      </TableCell>
                      <TableCell className="text-[12px] text-slate-500">
                        {b.status}
                      </TableCell>
                      <TableCell className="text-[12px] text-slate-500">
                        {b.calendarStatus}
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
