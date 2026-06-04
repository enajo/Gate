"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { KeyRound, Loader2, Save } from "lucide-react";

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

export type AccessCodeFormValues = {
  code: string;
  codeLabel: string;
  isActive: boolean;
};

export interface AccessCodeFormProps {
  className?: string;
  initialValues?: Partial<AccessCodeFormValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit?: (values: AccessCodeFormValues) => Promise<void> | void;
}

const defaultValues: AccessCodeFormValues = {
  code: "",
  codeLabel: "",
  isActive: true,
};

function mergeInitialValues(
  values?: Partial<AccessCodeFormValues>,
): AccessCodeFormValues {
  return {
    ...defaultValues,
    ...values,
    isActive:
      typeof values?.isActive === "boolean"
        ? values.isActive
        : defaultValues.isActive,
  };
}

export function AccessCodeForm({
  className,
  initialValues,
  isSubmitting = false,
  submitLabel = "Save access code",
  onSubmit,
  ...props
}: AccessCodeFormProps) {
  const form = useForm<AccessCodeFormValues>({
    defaultValues: mergeInitialValues(initialValues),
    mode: "onSubmit",
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form;

  const isActive = watch("isActive");
  const code = watch("code");
  const codeLabel = watch("codeLabel");

  async function submit(values: AccessCodeFormValues) {
    await onSubmit?.({
      ...values,
      code: values.code.trim(),
      codeLabel: values.codeLabel.trim(),
    });
  }

  return (
    <div className={className} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Access code details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <FormField
                  control={control}
                  name="code"
                  rules={{ required: "Access code is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="BETA2026"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Clients must enter this code to confirm their booking.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="codeLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Founder beta invite"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional internal note so you know what this code is for.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
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
                        Inactive codes can no longer be used at checkout.
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
                    <KeyRound className="size-5" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {code || "Your access code"}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {codeLabel?.trim() || "No internal label added."}
                  </p>

                  <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    What this does
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Access codes control who can finalize a booking after
                    selecting a slot. They’re useful for beta invites, VIP
                    access, or private booking flows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Save access code
              </p>
              <p className="text-sm text-slate-500">
                This updates which clients can confirm bookings.
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