"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type QuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "MULTIPLE_CHOICE"
  | "YES_NO";

export type QuestionFormValues = {
  questionText: string;
  questionType: QuestionType;
  helpText: string;
  optionsJson: string[];
  sortOrder: number;
  isRequired: boolean;
};

export interface QuestionFormProps {
  className?: string;
  initialValues?: Partial<QuestionFormValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit?: (values: QuestionFormValues) => Promise<void> | void;
}

const defaultValues: QuestionFormValues = {
  questionText: "",
  questionType: "SHORT_TEXT",
  helpText: "",
  optionsJson: ["", ""],
  sortOrder: 1,
  isRequired: true,
};

function mergeInitialValues(
  values?: Partial<QuestionFormValues>,
): QuestionFormValues {
  return {
    ...defaultValues,
    ...values,
    optionsJson:
      values?.optionsJson && values.optionsJson.length > 0
        ? values.optionsJson
        : defaultValues.optionsJson,
    sortOrder:
      typeof values?.sortOrder === "number"
        ? values.sortOrder
        : defaultValues.sortOrder,
    isRequired:
      typeof values?.isRequired === "boolean"
        ? values.isRequired
        : defaultValues.isRequired,
  };
}

function getQuestionTypeDescription(type: QuestionType) {
  switch (type) {
    case "SHORT_TEXT":
      return "Best for quick free-text answers.";
    case "LONG_TEXT":
      return "Best for detailed context and longer answers.";
    case "NUMBER":
      return "Best for revenue, team size, budget, or other numeric signals.";
    case "MULTIPLE_CHOICE":
      return "Best when you want structured answers and routing logic.";
    case "YES_NO":
      return "Best for simple binary decisions.";
    default:
      return "";
  }
}

export function QuestionForm({
  className,
  initialValues,
  isSubmitting = false,
  submitLabel = "Save question",
  onSubmit,
  ...props
}: QuestionFormProps) {
  const form = useForm<QuestionFormValues>({
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

  const questionType = watch("questionType");
  const options = watch("optionsJson");
  const isRequired = watch("isRequired");

  function addOption() {
    setValue("optionsJson", [...(options ?? []), ""], {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function updateOption(index: number, value: string) {
    const next = [...(options ?? [])];
    next[index] = value;
    setValue("optionsJson", next, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function removeOption(index: number) {
    const next = [...(options ?? [])].filter((_, itemIndex) => itemIndex !== index);
    setValue("optionsJson", next.length ? next : [""], {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  async function submit(values: QuestionFormValues) {
    await onSubmit?.({
      ...values,
      optionsJson:
        values.questionType === "MULTIPLE_CHOICE"
          ? values.optionsJson.map((option) => option.trim()).filter(Boolean)
          : [],
    });
  }

  return (
    <div className={className} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Question details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <FormField
                  control={control}
                  name="questionText"
                  rules={{ required: "Question text is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question text</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What is your current monthly revenue in EUR?"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Keep it short, clear, and easy to answer.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="questionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) =>
                              field.onChange(value as QuestionType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SHORT_TEXT">Short text</SelectItem>
                              <SelectItem value="LONG_TEXT">Long text</SelectItem>
                              <SelectItem value="NUMBER">Number</SelectItem>
                              <SelectItem value="MULTIPLE_CHOICE">
                                Multiple choice
                              </SelectItem>
                              <SelectItem value="YES_NO">Yes / No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          {getQuestionTypeDescription(questionType)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="sortOrder"
                    rules={{
                      required: "Sort order is required.",
                      min: {
                        value: 1,
                        message: "Sort order must be at least 1.",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            {...field}
                            value={field.value ?? 1}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Controls the order shown to the client.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="helpText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Help text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="This helps me understand whether this session is the right fit."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional guidance shown below the question.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {questionType === "MULTIPLE_CHOICE" ? (
                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Answer options
                        </p>
                        <p className="text-sm text-slate-500">
                          Add the options a client can choose from.
                        </p>
                      </div>

                      <Button type="button" variant="outline" onClick={addOption}>
                        <Plus className="size-4" />
                        Add option
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(options ?? []).map((option, index) => (
                        <div key={`${index}-${option}`} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(event) =>
                              updateOption(index, event.target.value)
                            }
                            placeholder={`Option ${index + 1}`}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => removeOption(index)}
                            disabled={(options ?? []).length <= 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <FormField
                  control={control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required</FormLabel>
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
                            Required
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
                            Optional
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {isRequired
                          ? "Clients must answer this question before they can continue."
                          : "Clients can skip this question if needed."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Question preview</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {questionType.replaceAll("_", " ")}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        isRequired
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isRequired ? "Required" : "Optional"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {watch("questionText") || "Your question will appear here"}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {watch("helpText") || "Optional help text will appear here."}
                  </p>

                  {questionType === "MULTIPLE_CHOICE" && (options ?? []).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(options ?? [])
                        .filter((option) => option.trim().length > 0)
                        .map((option) => (
                          <span
                            key={option}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                          >
                            {option}
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Save your question
              </p>
              <p className="text-sm text-slate-500">
                This updates the question shown in the Gatekeeper flow.
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