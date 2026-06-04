import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  ClipboardList,
  ExternalLink,
  LockKeyhole,
  Settings2,
  Sparkles,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { bookingService } from "@/server/services/booking.service";
import { onboardingService } from "@/server/services/onboarding.service";
import { profileService } from "@/server/services/profile.service";
import { CalendarModalCard } from "@/components/dashboard/calendar-modal-card";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { SignOutButton } from "@/components/auth/sign-out-button";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G"
  );
}

function getGreeting() {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardButton({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
}) {
  const className =
    variant === "primary"
      ? "inline-flex h-10 items-center justify-center rounded-full border border-[#475569] bg-[#475569] px-5 text-[14px] text-white transition duration-500 ease-out hover:bg-[#334155]"
      : "inline-flex h-10 items-center justify-center rounded-full border border-[#D8D0C6] px-5 text-[14px] text-[#2B2B2B] transition duration-500 ease-out hover:border-[#475569] hover:bg-[#475569] hover:text-white";

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch everything in parallel — degrade gracefully on errors
  const [onboardingResult, controlRoomResult, upcomingResult, holdsResult] =
    await Promise.allSettled([
      onboardingService.getState(session.user.id),
      profileService.getControlRoomState(session.user.id),
      bookingService.listUpcomingBookings(session.user.id),
      bookingService.listActiveHolds(session.user.id),
    ]);

  // If no profile exists at all → send to onboarding
  if (onboardingResult.status === "rejected") {
    redirect("/onboarding");
  }

  const onboardingState = onboardingResult.value;
  const controlRoomState =
    controlRoomResult.status === "fulfilled" ? controlRoomResult.value : null;
  const upcomingBookings =
    upcomingResult.status === "fulfilled" ? upcomingResult.value : [];
  const activeHolds =
    holdsResult.status === "fulfilled" ? holdsResult.value : [];

  // ── Derived values ─────────────────────────────────────────────────────────

  const profile = controlRoomState?.profile;
  const { checklist, counts, completionPercentage } = onboardingState;
  const isPublished = Boolean(controlRoomState?.publishedAt);
  const slug = onboardingState.slug;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const publicUrl = isPublished && slug ? `${baseUrl}/${slug}` : null;

  const displayName =
    profile?.name ?? session.user.name ?? session.user.email ?? "there";
  const firstName = displayName.split(" ")[0];
  const initials = getInitials(displayName);
  const greeting = getGreeting();

  const hasActivity = upcomingBookings.length > 0 || activeHolds.length > 0;
  const allSetupDone =
    checklist.hasIdentity && checklist.hasAtLeastOneService && isPublished;

  // Setup checklist (4 most impactful items)
  const setupItems = [
    {
      label: "Profile set up",
      completed: checklist.hasIdentity,
      href: "/app/control-room",
    },
    {
      label: "Service created",
      completed: checklist.hasAtLeastOneService,
      href: "/app/control-room",
    },
    {
      label: "Calendar connected",
      completed: checklist.hasConnectedCalendars,
      href: "/app/calendars",
    },
    {
      label: "Page published",
      completed: isPublished,
      href: "/app/control-room",
    },
  ];

  // Metrics
  const metrics = [
    { value: String(upcomingBookings.length), label: "Upcoming Bookings" },
    { value: String(activeHolds.length), label: "Pending Requests" },
    { value: String(counts.services), label: "Active Services" },
  ];

  // Link-based action cards (Calendar is handled separately as a modal)
  const linkCards = [
    {
      title: "Control Room",
      description:
        "Configure services, gate rules, access codes, and availability.",
      href: "/app/control-room",
      icon: Settings2,
      badge: null as number | null,
    },
    {
      title: "Bookings",
      description:
        "Review pending requests and confirmed sessions from qualified leads.",
      href: "/app/bookings",
      icon: ClipboardList,
      badge: activeHolds.length > 0 ? activeHolds.length : null,
    },
  ];

  // Recent activity strings from real bookings
  type ActivityBooking = {
    clientName?: string | null;
    serviceTitle?: string | null;
    slotStart: string | Date;
  };
  const recentActivity = (upcomingBookings as ActivityBooking[])
    .slice(0, 4)
    .map((b) => {
      const date = new Date(b.slotStart).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const who = b.clientName ?? "A lead";
      const service = b.serviceTitle ? ` · ${b.serviceTitle}` : "";
      return `${who} booked a session${service} on ${date}.`;
    });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.16),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(71,85,105,0.10),transparent_26%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_44%,#F3EDE2_100%)] text-[#2B2B2B]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F9FAFB]/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 text-[13px]">
          <Link href="/app" className="font-medium tracking-wide">
            GATE
          </Link>

          <div className="hidden items-center gap-7 text-[#6B7280] md:flex">
            <Link href="/app" className="text-[#2B2B2B]">
              Dashboard
            </Link>
            <Link href="/app/control-room">Control Room</Link>
            {publicUrl && (
              <Link
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Public Page
                <ExternalLink className="size-3" />
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <SignOutButton />
            <div className="flex size-8 items-center justify-center rounded-full bg-[#2B2B2B] text-[12px] text-white">
              {initials}
            </div>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,rgba(223,167,103,0.18),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.62),rgba(243,237,226,0.84))] p-8 shadow-[0_28px_90px_rgba(120,100,80,0.14)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#DFA767]/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[#DFA767]">
                {isPublished ? "Your gate is live" : "Setup in progress"}
              </p>

              <h1 className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.055em] sm:text-[64px]">
                {greeting}, {firstName}.
              </h1>

              <p className="mt-5 max-w-xl text-[17px] leading-[1.8] text-[#6B7280]">
                {isPublished
                  ? "Your gate is live and accepting qualified requests."
                  : "Complete your setup to start accepting qualified requests."}
              </p>

              {publicUrl ? (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D8D0C6] bg-white/45 px-4 text-[13px] text-[#6B7280]">
                    <LockKeyhole className="size-4 text-[#DFA767]" />
                    {publicUrl}
                  </div>
                  <CopyLinkButton url={publicUrl} />
                </div>
              ) : (
                <div className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-[#D8D0C6] bg-white/30 px-4 text-[13px] text-[#9CA3AF]">
                  <LockKeyhole className="size-4" />
                  Publish to get your public link
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {publicUrl && (
                <DashboardButton href={publicUrl} external>
                  Open Public Page
                  <ExternalLink className="ml-2 size-4" />
                </DashboardButton>
              )}
              <DashboardButton href="/app/control-room" variant="secondary">
                {isPublished ? "Edit Gate" : "Set Up Gate"}
              </DashboardButton>
            </div>
          </div>
        </div>

        {/* ── Setup checklist ─────────────────────────────────────────────── */}
        {!allSetupDone && (
          <div className="mt-5 rounded-[2rem] border border-[#E4DED4]/80 bg-white/45 p-5 backdrop-blur">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-[15px] font-medium">Complete your setup</p>
                  <span className="rounded-full bg-[#F3EDE2] px-2.5 py-0.5 text-[12px] font-medium text-[#6B7280]">
                    {completionPercentage}%
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  Finish the essentials before sharing your gate.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {setupItems.map((item) =>
                  item.completed ? (
                    <div
                      key={item.label}
                      className="inline-flex items-center rounded-full bg-[#166534]/10 px-3 py-2 text-[12px] text-[#166534]"
                    >
                      <Check className="mr-1.5 size-3.5" />
                      {item.label}
                    </div>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="inline-flex items-center rounded-full bg-[#F3EDE2] px-3 py-2 text-[12px] text-[#6B7280] transition hover:bg-[#E9DDD0]"
                    >
                      <span className="mr-1.5 size-2 shrink-0 rounded-full bg-[#DFA767]" />
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E4DED4]">
              <div
                className="h-full rounded-full bg-[#DFA767] transition-all duration-700"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Action cards ────────────────────────────────────────────────── */}
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {/* Calendar opens a modal — no page navigation */}
          <CalendarModalCard />

          {linkCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group relative overflow-hidden rounded-[2rem] border border-[#E4DED4]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.62),rgba(243,237,226,0.84))] p-7 shadow-[0_18px_50px_rgba(120,100,80,0.08)] transition duration-500 ease-out hover:-translate-y-1"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/60 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#2B2B2B] text-white">
                      <Icon className="size-5" />
                    </div>
                    {card.badge !== null && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                        {card.badge}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-6 text-[25px] font-semibold tracking-[-0.04em]">
                    {card.title}
                  </h2>

                  <p className="mt-3 text-[14px] leading-[1.7] text-[#6B7280]">
                    {card.description}
                  </p>

                  <div className="mt-7 inline-flex items-center text-[14px] text-[#475569]">
                    Open
                    <ArrowRight className="ml-2 size-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Activity / metrics ──────────────────────────────────────────── */}
        {hasActivity ? (
          <>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {metrics.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-[1.5rem] bg-white/45 p-6 shadow-[0_14px_36px_rgba(120,100,80,0.07)]"
                >
                  <p className="text-[34px] font-semibold tracking-[-0.05em]">
                    {value}
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">{label}</p>
                </div>
              ))}
            </div>

            {recentActivity.length > 0 && (
              <div className="mt-8 rounded-[2rem] bg-white/45 p-7 shadow-[0_18px_50px_rgba(120,100,80,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-medium">Recent activity</p>
                  <Link
                    href="/app/bookings"
                    className="text-[13px] text-[#6B7280] hover:text-[#2B2B2B]"
                  >
                    View all →
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 border-b border-[#D8D0C6] pb-4 last:border-0 last:pb-0"
                    >
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#DFA767]" />
                      <p className="text-[14px] leading-6 text-[#6B7280]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="relative mt-8 overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,rgba(223,167,103,0.14),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.56),rgba(243,237,226,0.84))] p-10 text-center shadow-[0_24px_80px_rgba(120,100,80,0.12)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#2B2B2B] text-white">
              <Sparkles className="size-6" />
            </div>

            <h2 className="mx-auto mt-6 max-w-xl text-[34px] font-semibold leading-tight tracking-[-0.045em]">
              No bookings yet.
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-[1.8] text-[#6B7280]">
              {isPublished
                ? "Share your gate link to start receiving qualified requests."
                : "Finish setting up your gate, then share your link to start accepting requests."}
            </p>

            <div className="mt-7 flex justify-center gap-3">
              {publicUrl && (
                <DashboardButton href={publicUrl} external>
                  Share Gate
                  <ExternalLink className="ml-2 size-4" />
                </DashboardButton>
              )}
              <DashboardButton href="/app/control-room" variant="secondary">
                {isPublished ? "Customize Gate" : "Set Up Your Gate"}
              </DashboardButton>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
