"use client";

import { Check, Paintbrush } from "lucide-react";
import type { ProfileState } from "./profile-settings";

interface AppearanceSettingsProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

type ThemePreset = {
  id: string;
  name: string;
  accentColor: string;
  backgroundColor: string;
};

const presets: ThemePreset[] = [
  {
    id: "aura-light",
    name: "Aura Light",
    accentColor: "#DFA767",
    backgroundColor: "#F6F2EA",
  },
  {
    id: "studio-slate",
    name: "Studio Slate",
    accentColor: "#CBA36B",
    backgroundColor: "#1E293B",
  },
  {
    id: "warm-editorial",
    name: "Warm Editorial",
    accentColor: "#B7794B",
    backgroundColor: "#F5EBDD",
  },
  {
    id: "minimal-stark",
    name: "Minimal Stark",
    accentColor: "#111827",
    backgroundColor: "#FFFFFF",
  },
  {
    id: "deep-evergreen",
    name: "Deep Evergreen",
    accentColor: "#6E8B74",
    backgroundColor: "#10261D",
  },
];

function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function getYiq(hexColor: string) {
  const cleanHex = hexColor.replace("#", "");

  if (cleanHex.length !== 6) return 255;

  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function AppearanceSettings({
  profile,
  setProfile,
}: AppearanceSettingsProps) {
  const accentColor = isValidHex(profile.theme.accentColor)
    ? profile.theme.accentColor
    : "#DFA767";

  const backgroundColor = isValidHex(profile.theme.backgroundColor)
    ? profile.theme.backgroundColor
    : "#F6F2EA";

  const isDark = getYiq(backgroundColor) < 135;

  function updateTheme(key: keyof ProfileState["theme"], value: string) {
    setProfile((current) => ({
      ...current,
      theme: {
        ...current.theme,
        [key]: value.toUpperCase(),
      },
    }));
  }

  return (
    <section className="rounded-[1.75rem] border border-[#E7E5E4] bg-white/75 p-6 shadow-[0_18px_50px_rgba(120,100,80,0.06)]">
      <div className="flex items-center gap-3">
        <Paintbrush className="size-5 text-[#DFA767]" />

        <div>
          <p className="text-[15px] font-medium text-[#2B2B2B]">
            Appearance
          </p>

          <p className="mt-1 text-[12px] text-[#6B7280]">
            Choose a preset or set custom colors. Full preview opens above.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {presets.map((preset) => {
          const active =
            profile.theme.accentColor === preset.accentColor &&
            profile.theme.backgroundColor === preset.backgroundColor;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                setProfile((current) => ({
                  ...current,
                  theme: {
                    accentColor: preset.accentColor,
                    backgroundColor: preset.backgroundColor,
                  },
                }))
              }
              className={
                active
                  ? "relative rounded-[1.2rem] border-2 border-[#2B2B2B] p-3 text-left"
                  : "relative rounded-[1.2rem] border border-[#E7E5E4] p-3 text-left transition hover:border-[#A8A29E]"
              }
              style={{ background: preset.backgroundColor }}
            >
              <div
                className="h-9 rounded-xl"
                style={{ background: preset.accentColor }}
              />

              <p
                className="mt-3 text-[12px] font-medium"
                style={{
                  color:
                    getYiq(preset.backgroundColor) < 135
                      ? "#F8FAFC"
                      : "#172033",
                }}
              >
                {preset.name}
              </p>

              {active ? (
                <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-[#111827] text-white">
                  <Check className="size-3" />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Accent Color">
          <ColorInput
            value={accentColor}
            onChange={(value) => updateTheme("accentColor", value)}
          />
        </Field>

        <Field label="Background Color">
          <ColorInput
            value={backgroundColor}
            onChange={(value) => updateTheme("backgroundColor", value)}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-[#E7E5E4] bg-white/70 px-4 py-3">
        <p className="text-[12px] leading-6 text-[#6B7280]">
          Contrast mode:{" "}
          <span className="font-medium text-[#2B2B2B]">
            {isDark ? "Dark background detected" : "Light background detected"}
          </span>
          . GATE will adjust text and surface contrast automatically in the
          public preview.
        </p>
      </div>
    </section>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-11 items-center gap-3 rounded-full border border-[#D8D0C6] bg-white/80 px-3">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
      />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-[13px] uppercase outline-none"
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium text-[#2B2B2B]">
        {label}
      </span>

      {children}
    </label>
  );
}