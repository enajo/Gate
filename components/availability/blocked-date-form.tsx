"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { CalendarOff, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type BlockedDateFormValues = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
};

export interface BlockedDateFormProps {
  className?: string;
  initialValues?: Partial<BlockedDateFormValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit?: (values: BlockedDateFormValues) => Promise<void> | void;
}

const defaultValues: BlockedDateFormValues = {
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "17:00",
  reason: "",
};

function mergeInitialValues(
  values?: Partial<BlockedDateFormValues>,
): BlockedDateFormValues {
  return {
    ...defaultValues,
    ...values,
  };
}

function formatPreviewRange(values: BlockedDateFormValues) {
  if (!values.startDate || !values.endDate) {
    return "Select a start and end date to preview the blocked range.";
  }

  return `${values.startDate} ${values.startTime} → ${values.endDate} ${values.endTime}`;
}

export function BlockedDateForm({
  className,
  initialValues,
  isSubmitting = false,
  submitLabel = "Save blocked date",
  onSubmit,
  ...props
}: BlockedDateFormProps) {
  const form = useForm<BlockedDateFormValues>({
    defaultValues: mergeInitialValues(initialValues),
    mode: "onSubmit",
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { isDirty },
    setError,
  } = form;

  const values = watch();

  async function submit(formValues: BlockedDateFormValues) {
    const start = new Date(
      `${formValues.startDate}T${formValues.startTime}:00`,
    ).getTime();
    const end = new Date(
      `${formValues.endDate}T${formValues.endTime}:00`,
    ).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      setError("startDate", {
        type: "manual",
        message: "Enter a valid start and end date/time.",
      });
      return;
    }

    if (end <= start) {
      setError("endTime", {
        type: "manual",
        message: "End date/time must be after the start date/time.",
      });
      return;
    }

    await onSubmit?.(formValues);
  }

  return (
    <div className={className} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Blocked date details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="startDate"
                    rules={{ required: "Start date is required." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="startTime"
                    rules={{ required: "Start time is required." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="endDate"
                    rules={{ required: "End date is required." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="endTime"
                    rules={{ required: "End time is required." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Vacation, conference, internal meeting, or another reason..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional note to explain why this time is unavailable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <CalendarOff className="size-5" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    Blocked time range
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {formatPreviewRange(values)}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Reason
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {values.reason?.trim() || "No reason provided."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    What this does
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    This one-off block removes time from your normal weekly
                    schedule so clients cannot book it.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Save blocked date
              </p>
              <p className="text-sm text-slate-500">
                This updates one-off unavailable time outside your weekly hours.
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}