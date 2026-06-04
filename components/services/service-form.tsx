"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, Sparkles } from "lucide-react";

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

export type ServiceFormValues = {
  title: string;
  slug: string;
  description: string;
  displayPrice: string;
  durationMinutes: number;
  preparationInstructions: string;
  active: boolean;
};

export interface ServiceFormProps {
  className?: string;
  initialValues?: Partial<ServiceFormValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit?: (values: ServiceFormValues) => Promise<void> | void;
}

const defaultValues: ServiceFormValues = {
  title: "",
  slug: "",
  description: "",
  displayPrice: "",
  durationMinutes: 30,
  preparationInstructions: "",
  active: true,
};

function mergeInitialValues(
  values?: Partial<ServiceFormValues>,
): ServiceFormValues {
  return {
    ...defaultValues,
    ...values,
    durationMinutes:
      typeof values?.durationMinutes === "number"
        ? values.durationMinutes
        : defaultValues.durationMinutes,
    active:
      typeof values?.active === "boolean"
        ? values.active
        : defaultValues.active,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function ServiceForm({
  className,
  initialValues,
  isSubmitting = false,
  submitLabel = "Save service",
  onSubmit,
  ...props
}: ServiceFormProps) {
  const form = useForm<ServiceFormValues>({
    defaultValues: mergeInitialValues(initialValues),
    mode: "onSubmit",
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = form;

  const title = watch("title");
  const slug = watch("slug");
  const durationMinutes = watch("durationMinutes");
  const active = watch("active");
  const displayPrice = watch("displayPrice");

  React.useEffect(() => {
    if (!slug && title) {
      setValue("slug", slugify(title), {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [slug, title, setValue]);

  async function submit(values: ServiceFormValues) {
    await onSubmit?.({
      ...values,
      slug: slugify(values.slug || values.title),
      durationMinutes: Number(values.durationMinutes) || 0,
    });
  }

  return (
    <div className={className} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Service details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <FormField
                  control={control}
                  name="title"
                  rules={{ required: "Service title is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Fractional CTO Strategy Session"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Name the outcome, not just the time slot.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="slug"
                  rules={{ required: "Service slug is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service slug</FormLabel>
                      <FormControl>
                        <div className="flex items-center rounded-md border border-slate-200 bg-white">
                          <span className="border-r border-slate-200 px-3 text-sm text-slate-500">
                            service/
                          </span>
                          <Input
                            className="border-0 shadow-none focus-visible:ring-0"
                            placeholder="fractional-cto-strategy-session"
                            {...field}
                            onChange={(event) =>
                              field.onChange(slugify(event.target.value))
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Used in your public service URL.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="displayPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display price</FormLabel>
                        <FormControl>
                          <Input placeholder="€250" {...field} />
                        </FormControl>
                        <FormDescription>
                          Shown on the public service card.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="durationMinutes"
                    rules={{
                      required: "Duration is required.",
                      min: {
                        value: 5,
                        message: "Duration must be at least 5 minutes.",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            placeholder="45"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Determines slot length and availability matching.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A focused strategy call for founders who need clarity on product architecture, roadmap bottlenecks, or technical hiring."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Explain what the client gets from this session.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="preparationInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preparation instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Bring your current product stage, main bottleneck, and one decision you need clarity on."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional notes shown before booking.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service status</FormLabel>
                      <FormControl>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                              field.value
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => field.onChange(true)}
                          >
                            Active
                          </button>

                          <button
                            type="button"
                            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                              !field.value
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => field.onChange(false)}
                          >
                            Inactive
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Inactive services won’t appear on the public page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Service preview</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {active ? "Active" : "Inactive"}
                      </div>

                      <div className="text-sm font-medium text-slate-500">
                        {formatDuration(Number(durationMinutes) || 0)}
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                      {title || "Your service title"}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      {watch("description") ||
                        "Your service description will appear here."}
                    </p>

                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Price
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {displayPrice || "Custom pricing"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Sparkles className="size-5" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Position your offer like a product
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Clear titles, a concrete promise, and simple prep notes
                          make the booking page feel premium.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Save your service
              </p>
              <p className="text-sm text-slate-500">
                This updates how the service appears in your dashboard and on
                your public page.
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