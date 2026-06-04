"use client";

import * as React from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { QuestionForm, type QuestionFormValues } from "@/components/qualification/question-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export type QualificationQuestionItem = QuestionFormValues & {
  id: string;
};

export interface QuestionBuilderProps {
  className?: string;
  questions: QualificationQuestionItem[];
  onChange?: (questions: QualificationQuestionItem[]) => void;
  onCreate?: () => void;
  onEdit?: (question: QualificationQuestionItem, index: number) => void;
  onDelete?: (question: QualificationQuestionItem, index: number) => void;
  onReorder?: (questions: QualificationQuestionItem[]) => void;
  createLabel?: string;
}

function getQuestionTypeLabel(type: QualificationQuestionItem["questionType"]) {
  switch (type) {
    case "SHORT_TEXT":
      return "Short text";
    case "LONG_TEXT":
      return "Long text";
    case "NUMBER":
      return "Number";
    case "MULTIPLE_CHOICE":
      return "Multiple choice";
    case "YES_NO":
      return "Yes / No";
    default:
      return type;
  }
}

export function QuestionBuilder({
  className,
  questions,
  onChange,
  onCreate,
  onEdit,
  onDelete,
  onReorder,
  createLabel = "Add question",
  ...props
}: QuestionBuilderProps) {
  function moveQuestion(index: number, direction: "up" | "down") {
    const next = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= next.length) {
      return;
    }

    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    const reordered = next.map((question, itemIndex) => ({
      ...question,
      sortOrder: itemIndex + 1,
    }));

    onChange?.(reordered);
    onReorder?.(reordered);
  }

  if (!questions.length) {
    return (
      <EmptyState
        className={className}
        title="No qualification questions yet"
        description="Start with 3 simple questions that help you decide who should reach your calendar."
        action={
          <Button type="button" onClick={onCreate}>
            <Plus className="size-4" />
            {createLabel}
          </Button>
        }
        {...props}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Qualification questions
          </h3>
          <p className="text-sm text-slate-500">
            These are shown to leads before they can unlock booking.
          </p>
        </div>

        <Button type="button" onClick={onCreate}>
          <Plus className="size-4" />
          {createLabel}
        </Button>
      </div>

      <div className="space-y-3">
        {questions
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((question, index) => (
            <Card key={question.id} className="rounded-2xl">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="mt-1 flex flex-col items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <GripVertical className="size-4" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => moveQuestion(index, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => moveQuestion(index, "down")}
                      disabled={index === questions.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          #{question.sortOrder}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {getQuestionTypeLabel(question.questionType)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                            question.isRequired
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {question.isRequired ? "Required" : "Optional"}
                        </span>
                      </div>

                      <h4 className="text-base font-semibold text-slate-900">
                        {question.questionText}
                      </h4>

                      {question.helpText ? (
                        <p className="text-sm text-slate-500">
                          {question.helpText}
                        </p>
                      ) : null}

                      {question.questionType === "MULTIPLE_CHOICE" &&
                      question.optionsJson?.length ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {question.optionsJson.map((option) => (
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

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onEdit?.(question, index)}
                      >
                        Edit
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDelete?.(question, index)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}