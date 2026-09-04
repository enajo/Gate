"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { BlockedDateForm, type BlockedDateFormValues } from "@/components/availability/blocked-date-form";
import { BlockedDatesList, type BlockedDateItem } from "@/components/availability/blocked-dates-list";
import { TimezoneSelect } from "@/components/availability/timezone-select";
import {
  WeeklyScheduleForm,
  type WeeklyScheduleRule,
} from "@/components/availability/weekly-schedule-form";
import { WeeklyAvailabilityPreview } from "@/components/availability/weekly-schedule-preview";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AvailabilityRulesResponse = {
  rules?: WeeklyScheduleRule[];
  rule?: WeeklyScheduleRule;
  error?: string;
};

type BlockedDatesResponse = {
  blockedDates?: BlockedDateItem[];
  blockedDate?: BlockedDateItem;
  error?: string;
};

export default function AvailabilityPage() {
  const [rules, setRules] = React.useState<WeeklyScheduleRule[]>([]);
  const [blockedDates, setBlockedDates] = React.useState<BlockedDateItem[]>([]);
  const [timezone, setTimezone] = React.useState("Europe/Berlin");

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingRules, setIsSavingRules] = React.useState(false);
  const [isSavingBlockedDate, setIsSavingBlockedDate] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [blockedDateDialogOpen, setBlockedDateDialogOpen] = React.useState(false);
  const [blockedDateDialogMode, setBlockedDateDialogMode] =
    React.useState<"create" | "edit">("create");
  const [selectedBlockedDate, setSelectedBlockedDate] =
    React.useState<BlockedDateItem | null>(null);

  const loadData = React.useCallback(async () => {
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

      const rulesData = (await rulesResponse.json()) as AvailabilityRulesResponse;
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
    void loadData();
  }, [loadData]);

  function openCreateBlockedDateDialog() {
    setBlockedDateDialogMode("create");
    setSelectedBlockedDate(null);
    setBlockedDateDialogOpen(true);
  }

  function openEditBlockedDateDialog(blockedDate: BlockedDateItem) {
    setBlockedDateDialogMode("edit");
    setSelectedBlockedDate(blockedDate);
    setBlockedDateDialogOpen(true);
  }

  async function handleSaveRules(nextRules: WeeklyScheduleRule[]) {
    setIsSavingRules(true);
    setError(null);

    try {
      const existingRules = new Map(
        rules
          .filter((rule) => rule.id)
          .map((rule) => [rule.id as string, rule]),
      );
      const nextRuleIds = new Set(
        nextRules.map((rule) => rule.id).filter(Boolean) as string[],
      );

      const deletedRules = rules.filter(
        (rule) => rule.id && !nextRuleIds.has(rule.id),
      );

      for (const deletedRule of deletedRules) {
        const response = await fetch("/api/app/availability/rules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...deletedRule,
            active: false,
          }),
        });

        const data = (await response.json()) as AvailabilityRulesResponse;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to update availability rules.");
        }
      }

      const persistedRules: WeeklyScheduleRule[] = [];

      for (const rule of nextRules) {
        const isExisting = !!rule.id && existingRules.has(rule.id);
        const payload = {
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          active: rule.active,
        };

        const response = await fetch("/api/app/availability/rules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as AvailabilityRulesResponse;

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Failed to ${isExisting ? "update" : "create"} availability rule.`,
          );
        }

        persistedRules.push(data.rule ?? rule);
      }

      setRules(persistedRules);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save availability rules.",
      );
    } finally {
      setIsSavingRules(false);
    }
  }

  function mapBlockedDateToFormValues(
    blockedDate: BlockedDateItem | null,
  ): Partial<BlockedDateFormValues> | undefined {
    if (!blockedDate) {
      return undefined;
    }

    const start = new Date(blockedDate.startDateTime);
    const end = new Date(blockedDate.endDateTime);

    const toDate = (value: Date) => value.toISOString().slice(0, 10);
    const toTime = (value: Date) => value.toISOString().slice(11, 16);

    return {
      startDate: toDate(start),
      startTime: toTime(start),
      endDate: toDate(end),
      endTime: toTime(end),
      reason: blockedDate.reason ?? "",
    };
  }

  async function handleBlockedDateSubmit(values: BlockedDateFormValues) {
    setIsSavingBlockedDate(true);
    setError(null);

    try {
      const startDateTime = new Date(
        `${values.startDate}T${values.startTime}:00`,
      ).toISOString();
      const endDateTime = new Date(
        `${values.endDate}T${values.endTime}:00`,
      ).toISOString();

      const isEdit =
        blockedDateDialogMode === "edit" && selectedBlockedDate?.id;

      const endpoint = "/api/app/availability/blocked-dates";
      const method = "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDateTime,
          endDateTime,
          reason: values.reason,
          id: isEdit ? selectedBlockedDate?.id : undefined,
        }),
      });

      const data = (await response.json()) as BlockedDatesResponse;

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to ${isEdit ? "update" : "create"} blocked date.`,
        );
      }

      if (data.blockedDate) {
        setBlockedDates((current) => {
          if (isEdit) {
            return current
              .map((item) =>
                item.id === data.blockedDate!.id ? data.blockedDate! : item,
              )
              .sort(
                (a, b) =>
                  new Date(a.startDateTime).getTime() -
                  new Date(b.startDateTime).getTime(),
              );
          }

          return [...current, data.blockedDate!].sort(
            (a, b) =>
              new Date(a.startDateTime).getTime() -
              new Date(b.startDateTime).getTime(),
          );
        });
      } else {
        await loadData();
      }

      setBlockedDateDialogOpen(false);
      setSelectedBlockedDate(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save blocked date.",
      );
      throw saveError;
    } finally {
      setIsSavingBlockedDate(false);
    }
  }

  async function handleDeleteBlockedDate(blockedDate: BlockedDateItem) {
    setError(null);

    try {
      const response = await fetch("/api/app/availability/blocked-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: blockedDate.id,
          deleted: true,
        }),
      });

      const data = (await response.json()) as BlockedDatesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete blocked date.");
      }

      setBlockedDates((current) =>
        current.filter((item) => item.id !== blockedDate.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete blocked date.",
      );
    }
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Availability"
          description="Set your weekly schedule, block one-off dates, and define the timezone used for bookings."
          maxWidth="full"
        />
      }
      actions={
        <Button type="button" onClick={openCreateBlockedDateDialog}>
          <Plus className="size-4" />
          Add blocked date
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading availability"
          description="Please wait while we fetch your availability settings."
        />
      ) : error && rules.length === 0 && blockedDates.length === 0 ? (
        <ErrorState
          inset
          title="Could not load availability"
          description={error}
        />
      ) : (
        <div className="space-y-8">
          {error ? (
            <ErrorState
              inset
              title="Something went wrong"
              description={error}
            />
          ) : null}

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Booking timezone</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <TimezoneSelect value={timezone} onChange={setTimezone} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Weekly schedule</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <WeeklyAvailabilityPreview rules={rules} />
              <WeeklyScheduleForm value={rules} onChange={setRules} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSaveRules(rules)}
                  disabled={isSavingRules}
                >
                  Save weekly schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Blocked dates</CardTitle>
            </CardHeader>

            <CardContent>
              <BlockedDatesList
                blockedDates={blockedDates}
                timezone={timezone}
                onEdit={openEditBlockedDateDialog}
                onDelete={handleDeleteBlockedDate}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={blockedDateDialogOpen}
        onOpenChange={setBlockedDateDialogOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {blockedDateDialogMode === "edit"
                ? "Edit blocked date"
                : "Create blocked date"}
            </DialogTitle>
            <DialogDescription>
              Remove one-off unavailable time from your normal weekly schedule.
            </DialogDescription>
          </DialogHeader>

          <BlockedDateForm
            initialValues={mapBlockedDateToFormValues(selectedBlockedDate)}
            isSubmitting={isSavingBlockedDate}
            submitLabel={
              blockedDateDialogMode === "edit"
                ? "Save changes"
                : "Create blocked date"
            }
            onSubmit={handleBlockedDateSubmit}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}