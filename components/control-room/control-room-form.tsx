"use client";

import * as React from "react";

import { AppearanceSettings } from "./appearance-settings";
import { AvailabilitySettings } from "./availability-settings";
import { GateSettings } from "./gate-settings";
import { ProfileSettings, type ProfileState } from "./profile-settings";
import { cn } from "@/lib/utils";

interface ControlRoomFormProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "gate", label: "Gate Control" },
  { id: "availability", label: "Availability" },
  { id: "appearance", label: "Appearance" },
] as const;

// Jump-link nav, not a full scroll-spy — a long single-column settings page
// with no wayfinding is a step behind how Stripe/Linear/Notion structure
// theirs. Kept to click-to-jump rather than tracking scroll position: the
// active-section highlight isn't worth the extra complexity here.
function SectionNav() {
  const [active, setActive] = React.useState<string>(SECTIONS[0].id);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-20 space-y-1" aria-label="Control Room sections">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            "block rounded-lg px-3 py-2 text-[13px] transition",
            active === section.id
              ? "bg-white font-medium text-ink shadow-warm-xs"
              : "text-gray-500 hover:bg-white/60 hover:text-ink",
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

export function ControlRoomForm({ profile, setProfile }: ControlRoomFormProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <SectionNav />
      </div>

      <div className="min-w-0 space-y-6">
        <ProfileSettings profile={profile} setProfile={setProfile} />

        <GateSettings profile={profile} setProfile={setProfile} />

        <AvailabilitySettings />

        <AppearanceSettings profile={profile} setProfile={setProfile} />
      </div>
    </div>
  );
}
