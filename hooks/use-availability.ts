"use client";

import * as React from "react";

export type AvailabilityRule = {
  id?: string;
  weekday:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  startTime: string;
  endTime: string;
  active: boolean;
};

export type BlockedDate = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string | null;
};

type AvailabilityRulesResponse = {
  rules?: AvailabilityRule[];
  rule?: AvailabilityRule;
  error?: string;
};

type BlockedDatesResponse = {
  blockedDates?: BlockedDate[];
  blockedDate?: BlockedDate;
  error?: string;
};

export function useAvailability() {
  const [rules, setRules] = React.useState<AvailabilityRule[]>([]);
  const [blockedDates, setBlockedDates] = React.useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAvailability = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [rulesResponse, blockedDatesResponse] = await Promise.all([
        fetch("/api/app/availability/rules", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/app/availability/blocked-dates", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const rulesData =
        (await rulesResponse.json()) as AvailabilityRulesResponse;
      const blockedDatesData =
        (await blockedDatesResponse.json()) as BlockedDatesResponse;

      if (!rulesResponse.ok) {
        throw new Error(rulesData?.error || "Failed to load availability rules.");
      }

      if (!blockedDatesResponse.ok) {
        throw new Error(
          blockedDatesData?.error || "Failed to load blocked dates.",
        );
      }

      setRules(rulesData.rules ?? []);
      setBlockedDates(blockedDatesData.blockedDates ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load availability settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  async function createAvailabilityRule(
    input: Omit<AvailabilityRule, "id">,
  ) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/availability/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as AvailabilityRulesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create availability rule.");
      }

      if (data.rule) {
        setRules((current) => [...current, data.rule!]);
      } else {
        await loadAvailability();
      }

      return data.rule ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create availability rule.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function createBlockedDate(
    input: Omit<BlockedDate, "id">,
  ) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/availability/blocked-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as BlockedDatesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create blocked date.");
      }

      if (data.blockedDate) {
        setBlockedDates((current) =>
          [...current, data.blockedDate!].sort(
            (a, b) =>
              new Date(a.startDateTime).getTime() -
              new Date(b.startDateTime).getTime(),
          ),
        );
      } else {
        await loadAvailability();
      }

      return data.blockedDate ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create blocked date.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    rules,
    blockedDates,
    isLoading,
    isSaving,
    error,
    refetch: loadAvailability,
    createAvailabilityRule,
    createBlockedDate,
  };
}