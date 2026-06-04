"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";

import {
  PublicSalesPageTemplate,
  type PublicSalesPageTemplateData,
  type AvailabilityDate,
  type AvailabilityTime,
} from "@/components/public-page/public-sales-page-template";
import type { ProfileState } from "./profile-settings";

interface ControlRoomPreviewProps {
  profile: ProfileState;
}

// ── Mock availability for preview (Phase 2 will replace with real slots) ──────

function getMockDates(): AvailabilityDate[] {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return {
      id: `preview-date-${i}`,
      label: weekdays[d.getDay()] ?? "Mon",
      day: String(d.getDate()),
      monthLabel: months[d.getMonth()] ?? "Jan",
    };
  });
}

function getMockTimes(): AvailabilityTime[] {
  return [
    { id: "t1", label: "9:00 AM" },
    { id: "t2", label: "10:00 AM" },
    { id: "t3", label: "11:00 AM" },
    { id: "t4", label: "2:00 PM" },
    { id: "t5", label: "3:00 PM" },
  ];
}

// ── Ready check — only requires profile essentials, not availability ──────────

function isPreviewReady(profile: ProfileState): boolean {
  // Minimal bar: a name and at least one service with a title.
  // Role, theme, and availability are filled in with defaults if missing.
  return Boolean(
    profile.name &&
      Array.isArray(profile.services) &&
      profile.services.length > 0 &&
      profile.services.some((svc) => svc.title),
  );
}

export function ControlRoomPreview({ profile }: ControlRoomPreviewProps) {
  const [open, setOpen] = useState(false);
  const ready = isPreviewReady(profile);

  // Merge defaults so the template always has something to render
  const previewData: PublicSalesPageTemplateData = {
    ...profile,
    role: profile.role || "",
    timezone: profile.timezone || "UTC",
    theme: {
      accentColor: profile.theme?.accentColor ?? "#DFA767",
      backgroundColor: profile.theme?.backgroundColor ?? "#F6F2EA",
    },
    activeServiceId:
      profile.activeServiceId || profile.services[0]?.id || "",
    availableDates: getMockDates(),
    availableTimes: getMockTimes(),
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-full border border-[#2B2B2B] bg-[#2B2B2B] px-5 text-[14px] text-white transition duration-500 ease-out hover:bg-[#111111]"
      >
        Preview Public Page
        <Eye className="ml-2 size-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/55 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-[#F9FAFB] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4DED4] px-5 py-4">
              <div>
                <p className="text-[15px] font-medium text-[#2B2B2B]">
                  Public Page Preview
                </p>

                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Draft changes appear here first. Visitors only see updates
                  after publish. Availability slots shown are mock data.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-full border border-[#D8D0C6] text-[#2B2B2B] transition hover:border-[#2B2B2B]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {ready ? (
                <PublicSalesPageTemplate data={previewData} preview />
              ) : (
                <div className="flex min-h-full items-center justify-center px-6 py-20">
                  <div className="max-w-md text-center">
                    <p className="text-[22px] font-semibold tracking-[-0.04em] text-[#2B2B2B]">
                      Preview not ready yet.
                    </p>

                    <p className="mt-3 text-[14px] leading-7 text-[#6B7280]">
                      Fill in your name, title, and at least one service with a
                      title and duration to see the preview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
