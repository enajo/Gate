"use client";

import * as React from "react";
import { Clock3 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TimezoneSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const commonTimezones = [
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "UTC",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function buildTimezoneOptions(currentValue?: string) {
  const browserTimezone = getBrowserTimezone();

  return Array.from(
    new Set(
      [currentValue, browserTimezone, ...commonTimezones].filter(Boolean),
    ),
  );
}

export function TimezoneSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select timezone",
  ...props
}: TimezoneSelectProps) {
  const options = React.useMemo(() => buildTimezoneOptions(value), [value]);

  return (
    <div {...props}>
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-slate-500" />
            <SelectValue placeholder={placeholder} />
          </div>
        </SelectTrigger>

        <SelectContent>
          {options.map((timezone) => (
            <SelectItem key={timezone} value={timezone}>
              {timezone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}