"use client";

import * as React from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export type ThemeSettingsValue = {
  theme?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  fontPair?: string | null;
};

export interface ThemeSelectorProps {
  className?: string;
  value?: ThemeSettingsValue;
  onChange?: (value: ThemeSettingsValue) => void;
  disabled?: boolean;
}

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Clean and bright public page.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Bold and premium look.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow the visitor’s preference.",
    icon: Monitor,
  },
] as const;

const fontPairOptions = [
  {
    value: "inter-manrope",
    label: "Inter + Manrope",
    description: "Modern and polished.",
  },
  {
    value: "inter-space-grotesk",
    label: "Inter + Space Grotesk",
    description: "Sharper and more expressive.",
  },
  {
    value: "manrope-inter",
    label: "Manrope + Inter",
    description: "Soft and premium.",
  },
] as const;

const accentSwatches = [
  "#6366f1",
  "#8b5cf6",
  "#0f172a",
  "#2563eb",
  "#059669",
  "#dc2626",
] as const;

const primarySwatches = [
  "#0f172a",
  "#111827",
  "#1e293b",
  "#1f2937",
  "#0b1220",
  "#172554",
] as const;

const defaultValue: ThemeSettingsValue = {
  theme: "light",
  primaryColor: "#0f172a",
  accentColor: "#6366f1",
  fontPair: "inter-manrope",
};

function mergeValue(value?: ThemeSettingsValue): ThemeSettingsValue {
  return {
    ...defaultValue,
    ...(value ?? {}),
  };
}

function ColorSwatch({
  color,
  selected,
  onClick,
  disabled,
  label,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative size-9 rounded-full border border-slate-200 shadow-sm transition-transform",
        "focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected && "scale-105 ring-2 ring-slate-900 ring-offset-2",
      )}
      style={{ backgroundColor: color }}
    >
      {selected ? (
        <span className="absolute inset-0 flex items-center justify-center text-white">
          <Check className="size-4" />
        </span>
      ) : null}
    </button>
  );
}

export function ThemeSelector({
  className,
  value,
  onChange,
  disabled = false,
  ...props
}: ThemeSelectorProps) {
  const merged = mergeValue(value);

  function update(patch: Partial<ThemeSettingsValue>) {
    onChange?.({
      ...merged,
      ...patch,
    });
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-900">Theme mode</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = merged.theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => update({ theme: option.value })}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="size-5" />
                  {selected ? <Check className="size-4" /> : null}
                </div>
                <p className="mt-3 text-sm font-semibold">{option.label}</p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    selected ? "text-slate-200" : "text-slate-500",
                  )}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-slate-500" />
          <p className="text-sm font-medium text-slate-900">Primary color</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {primarySwatches.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              label={`Primary color ${color}`}
              selected={merged.primaryColor === color}
              disabled={disabled}
              onClick={() => update({ primaryColor: color })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-900">Accent color</p>
        <div className="flex flex-wrap gap-3">
          {accentSwatches.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              label={`Accent color ${color}`}
              selected={merged.accentColor === color}
              disabled={disabled}
              onClick={() => update({ accentColor: color })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-900">Font pairing</p>
        <div className="grid gap-3">
          {fontPairOptions.map((option) => {
            const selected = merged.fontPair === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => update({ fontPair: option.value })}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-xl border p-4 text-left transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {option.description}
                  </p>
                </div>

                {selected ? (
                  <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Live preview
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${merged.accentColor ?? defaultValue.accentColor}18`,
              color: merged.primaryColor ?? defaultValue.primaryColor ?? undefined,
            }}
          >
            Premium expert storefront
          </div>

          <h3
            className="mt-4 text-xl font-semibold"
            style={{ color: merged.primaryColor ?? defaultValue.primaryColor ?? undefined }}
          >
            Your public page preview
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            This is how your profile styling will feel on the public-facing
            expert page.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{
                backgroundColor: merged.primaryColor ?? defaultValue.primaryColor ?? undefined,
              }}
            >
              Apply to work with me
            </button>

            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: merged.accentColor ?? defaultValue.accentColor ?? undefined,
                color: merged.primaryColor ?? defaultValue.primaryColor ?? undefined,
              }}
            >
              Learn more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}