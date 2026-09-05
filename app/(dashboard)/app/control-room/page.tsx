"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  UploadCloud,
} from "lucide-react";

import { ControlRoomForm } from "@/components/control-room/control-room-form";
import { ControlRoomPreview } from "@/components/control-room/control-room-preview";
import type { ProfileState } from "@/components/control-room/profile-settings";
import type { PublicSalesPageTemplateData } from "@/components/public-page/public-sales-page-template";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ControlRoomPage() {
  const [draftProfile, setDraftProfile] = useState<ProfileState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load on mount ─────────────────────────────────────────────────────────

  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/app/control-room", {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        // 404 means no profile yet — start with empty state.
        if (response.status === 404) {
          setDraftProfile(getEmptyProfile());
          return;
        }
        throw new Error(payload.error ?? "Failed to load Control Room.");
      }

      const data = (await response.json()) as {
        profile: PublicSalesPageTemplateData;
        publishedAt: string | null;
      };

      setDraftProfile(data.profile);
      setPublishedAt(data.publishedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // ── Save draft ────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!draftProfile || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/app/control-room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftProfile),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to save draft.");
      }

      const data = (await response.json()) as {
        profile: PublicSalesPageTemplateData;
        publishedAt: string | null;
      };

      // Refresh from server to pick up any server-side transforms
      // (e.g. auto-generated access codes).
      setDraftProfile(data.profile);
      setPublishedAt(data.publishedAt);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Unpublish ─────────────────────────────────────────────────────────────

  async function handleUnpublish() {
    if (isUnpublishing) return;

    try {
      setIsUnpublishing(true);
      setError(null);

      const response = await fetch("/api/app/control-room/publish", {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to unpublish.");
      }

      setPublishedAt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish.");
    } finally {
      setIsUnpublishing(false);
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  async function handlePublish() {
    if (!draftProfile || isPublishing) return;

    try {
      setIsPublishing(true);
      setError(null);

      // Save first so publish reflects latest edits.
      const saveResponse = await fetch("/api/app/control-room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftProfile),
      });

      if (!saveResponse.ok) {
        const payload = (await saveResponse.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to save before publishing.");
      }

      const publishResponse = await fetch("/api/app/control-room/publish", {
        method: "POST",
      });

      if (!publishResponse.ok) {
        const payload = (await publishResponse.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to publish.");
      }

      const payload = (await publishResponse.json()) as { publishedAt: string };
      setPublishedAt(payload.publishedAt);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setIsPublishing(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const slug = useMemo(() => {
    if (!draftProfile?.name) return "";
    return draftProfile.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }, [draftProfile?.name]);

  const publicUrl =
    slug && getBaseUrl() ? `${getBaseUrl()}/${slug}` : `/${slug}`;

  const initials = draftProfile?.name ? getInitials(draftProfile.name) : "G";

  // Wrap the nullable setter so ControlRoomForm receives a non-nullable one.
  // The guard below (`if (!draftProfile) return null`) ensures this is only
  // called when draftProfile is already non-null.
  const setProfile = useCallback<Dispatch<SetStateAction<ProfileState>>>(
    (action) => {
      setDraftProfile((prev) => {
        if (prev === null) return prev;
        return typeof action === "function" ? action(prev) : action;
      });
    },
    [],
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.16),transparent_30%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_44%,#F3EDE2_100%)]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="size-6 animate-spin text-brand-amber" />
          <p className="text-[13px]">Loading Control Room…</p>
        </div>
      </main>
    );
  }

  if (!draftProfile) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.16),transparent_30%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_44%,#F3EDE2_100%)] text-ink">
      <header className="sticky top-0 z-50 bg-gray-50/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 text-[13px]">
          <Link href="/app" className="font-medium tracking-wide">
            GATE
          </Link>

          <div className="hidden items-center gap-7 text-gray-500 md:flex">
            <Link href="/app">Dashboard</Link>

            <Link href="/app/control-room" className="text-ink">
              Control Room
            </Link>

            {slug ? (
              <Link
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Public Page
                <ExternalLink className="size-3" />
              </Link>
            ) : null}
          </div>

          <div className="flex size-8 items-center justify-center rounded-full bg-ink text-[12px] text-white">
            {initials}
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10">
        {/* Page header — a settings screen opened many times a day doesn't
            need marketing-hero energy; a calm, functional header with the
            actions people actually reach for every visit. */}
        <div className="flex flex-col justify-between gap-6 border-b border-warm-border-soft pb-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
                Control Room
              </h1>

              {publishedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-amber-faint px-2.5 py-1 text-[11px] font-medium text-brand-amber">
                  Draft only — not visible publicly
                </span>
              )}

              {savedAt ? (
                <span className="text-[11px] text-gray-400">Draft saved</span>
              ) : null}
            </div>

            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-gray-500">
              Configure your expert profile, services, qualification gates,
              pricing, access codes, availability exposure, and publish
              state.
            </p>

            {error ? (
              <p className="mt-2 text-[13px] text-red-500">{error}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <ControlRoomPreview profile={draftProfile} />

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-full border border-warm-border-soft bg-white px-5 text-[14px] text-ink transition hover:border-ink disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {isSaving ? "Saving…" : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || isSaving}
              className="inline-flex h-10 items-center justify-center rounded-full border border-brand-amber bg-[linear-gradient(135deg,#DFA767,#E8BC82)] px-5 text-[14px] text-ink transition hover:brightness-[1.04] disabled:opacity-60"
            >
              {isPublishing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 size-4" />
              )}
              {isPublishing
                ? "Publishing…"
                : publishedAt
                  ? "Publish Update"
                  : "Publish"}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="mt-8">
          <ControlRoomForm
            profile={draftProfile}
            setProfile={setProfile}
          />
        </div>
      </section>
    </main>
  );
}

// ── Empty state for new users ─────────────────────────────────────────────────

function getEmptyProfile(): ProfileState {
  const defaultServiceId = crypto.randomUUID();

  return {
    name: "",
    role: "",
    bio: "",
    avatarUrl: null,
    theme: {
      accentColor: "#DFA767",
      backgroundColor: "#F6F2EA",
    },
    services: [
      {
        id: defaultServiceId,
        title: "Intro Call",
        headline: "",
        duration: "30 min",
        format: "Video call",
        price: "",
        currency: "$",
        qualificationRequired: false,
        paymentRequired: false,
        accessCodeRequired: false,
        manualApprovalRequired: false,
        availabilityExposure: "TWO_WEEKS",
        currentAccessCode: undefined,
        questions: [],
      },
    ],
    activeServiceId: defaultServiceId,
    timezone: "UTC",
    availableDates: [],
    availableTimes: [],
    metrics: [],
    featuredReview: null,
  };
}
