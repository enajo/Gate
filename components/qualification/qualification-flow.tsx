"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import type { QualificationQuestionItem } from "@/components/qualification/question-builder";
import type { QualificationRuleValue } from "@/components/qualification/rules-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FlowResult =
  | {
      result: "QUALIFIED";
      title: string;
      description: string;
    }
  | {
      result: "REJECTED" | "REDIRECTED";
      title: string;
      description: string;
    };

export interface QualificationFlowProps
  extends React.HTMLAttributes<HTMLDivElement> {
  questions: QualificationQuestionItem[];
  rules: QualificationRuleValue[];
  title?: string;
  description?: string;
}

function normalizeValue(
  value: unknown,
  type: QualificationQuestionItem["questionType"],
) {
  if (type === "NUMBER") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (type === "YES_NO") {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return null;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function evaluateCondition(
  answer: unknown,
  operator: string,
  value: unknown,
) {
  switch (operator) {
    case "eq":
      return answer === value;
    case "neq":
      return answer !== value;
    case "gt":
      return Number(answer) > Number(value);
    case "gte":
      return Number(answer) >= Number(value);
    case "lt":
      return Number(answer) < Number(value);
    case "lte":
      return Number(answer) <= Number(value);
    case "contains":
      return String(answer ?? "")
        .toLowerCase()
        .includes(String(value ?? "").toLowerCase());
    case "in": {
      const raw = String(value ?? "");
      const allowed = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return allowed.includes(String(answer ?? ""));
    }
    default:
      return false;
  }
}

function evaluateRules(
  questions: QualificationQuestionItem[],
  rules: QualificationRuleValue[],
  answers: Record<string, unknown>,
): FlowResult | null {
  const sortedRules = rules
    .filter((rule) => rule.active)
    .slice()
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const allConditions = rule.conditionsJson.all ?? [];
    const anyConditions = rule.conditionsJson.any ?? [];

    const evaluateOne = (condition: {
      field: string;
      operator: string;
      value: string;
    }) => {
      const question = questions.find((item) => item.id === condition.field);
      if (!question) return false;

      const rawAnswer = answers[condition.field];
      const normalizedAnswer = normalizeValue(rawAnswer, question.questionType);
      const normalizedConditionValue =
        question.questionType === "NUMBER"
          ? Number(condition.value)
          : question.questionType === "YES_NO"
            ? condition.value === "true"
            : condition.value;

      return evaluateCondition(
        normalizedAnswer,
        condition.operator,
        normalizedConditionValue,
      );
    };

    const matched =
      allConditions.length > 0
        ? allConditions.every(evaluateOne)
        : anyConditions.length > 0
          ? anyConditions.some(evaluateOne)
          : false;

    if (!matched) continue;

    if (rule.outcomeType === "ALLOW_BOOKING") {
      return {
        result: "QUALIFIED",
        title: "Lead qualified",
        description:
          rule.outcomeValue?.trim() ||
          "This lead would unlock booking based on the current rules.",
      };
    }

    if (rule.outcomeType === "REJECT") {
      return {
        result: "REJECTED",
        title: "Lead rejected",
        description:
          rule.outcomeValue?.trim() ||
          "This lead would see a rejection message and would not unlock booking.",
      };
    }

    return {
      result: "REDIRECTED",
      title: "Lead redirected",
      description:
        rule.outcomeValue?.trim() ||
        "This lead would be redirected to another step or resource.",
    };
  }

  return null;
}

export function QualificationFlow({
  className,
  questions,
  rules,
  title = "Qualification flow preview",
  description = "Test your Gatekeeper with sample answers to see how your rules behave before publishing.",
  ...props
}: QualificationFlowProps) {
  const sortedQuestions = questions
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [result, setResult] = React.useState<FlowResult | null>(null);

  function updateAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  function runPreview() {
    const nextResult = evaluateRules(sortedQuestions, rules, answers);

    setResult(
      nextResult || {
        result: "REJECTED",
        title: "No rule matched",
        description:
          "None of the active rules matched these answers. In the current setup, this lead would not move forward unless you add a matching allow rule.",
      },
    );
  }

  function resetPreview() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Sample lead answers</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {sortedQuestions.length === 0 ? (
              <p className="text-sm text-slate-500">
                Add questions first to preview the qualification flow.
              </p>
            ) : (
              sortedQuestions.map((question) => {
                const value = answers[question.id] ?? "";

                return (
                  <div key={question.id} className="space-y-2">
                    <Label>
                      {question.questionText}
                      {question.isRequired ? " *" : ""}
                    </Label>

                    {question.helpText ? (
                      <p className="text-sm text-slate-500">{question.helpText}</p>
                    ) : null}

                    {question.questionType === "SHORT_TEXT" ? (
                      <Input
                        value={String(value)}
                        onChange={(event) =>
                          updateAnswer(question.id, event.target.value)
                        }
                        placeholder="Type an answer"
                      />
                    ) : null}

                    {question.questionType === "LONG_TEXT" ? (
                      <Textarea
                        value={String(value)}
                        onChange={(event) =>
                          updateAnswer(question.id, event.target.value)
                        }
                        placeholder="Type an answer"
                      />
                    ) : null}

                    {question.questionType === "NUMBER" ? (
                      <Input
                        type="number"
                        value={String(value)}
                        onChange={(event) =>
                          updateAnswer(question.id, event.target.value)
                        }
                        placeholder="Enter a number"
                      />
                    ) : null}

                    {question.questionType === "MULTIPLE_CHOICE" ? (
                      <Select
                        value={typeof value === "string" ? value : ""}
                        onValueChange={(nextValue) =>
                          updateAnswer(question.id, nextValue)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {(question.optionsJson ?? []).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}

                    {question.questionType === "YES_NO" ? (
                      <Select
                        value={
                          value === true || value === "true"
                            ? "true"
                            : value === false || value === "false"
                              ? "false"
                              : ""
                        }
                        onValueChange={(nextValue) =>
                          updateAnswer(question.id, nextValue)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select yes or no" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                );
              })
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={runPreview}
                disabled={!sortedQuestions.length || !rules.length}
              >
                <ArrowRight className="size-4" />
                Run preview
              </Button>

              <Button type="button" variant="outline" onClick={resetPreview}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Evaluation result</CardTitle>
          </CardHeader>

          <CardContent>
            {!result ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Enter some sample answers and run the preview to see how your
                Gatekeeper responds.
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-2xl border p-6",
                  result.result === "QUALIFIED" &&
                    "border-emerald-200 bg-emerald-50",
                  result.result === "REJECTED" &&
                    "border-red-200 bg-red-50",
                  result.result === "REDIRECTED" &&
                    "border-amber-200 bg-amber-50",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-full",
                      result.result === "QUALIFIED" &&
                        "bg-emerald-100 text-emerald-700",
                      result.result === "REJECTED" &&
                        "bg-red-100 text-red-700",
                      result.result === "REDIRECTED" &&
                        "bg-amber-100 text-amber-700",
                    )}
                  >
                    {result.result === "QUALIFIED" ? (
                      <CheckCircle2 className="size-6" />
                    ) : result.result === "REDIRECTED" ? (
                      <ArrowRight className="size-6" />
                    ) : (
                      <XCircle className="size-6" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          result.result === "QUALIFIED"
                            ? "success"
                            : result.result === "REDIRECTED"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {result.result}
                      </Badge>

                      <Badge variant="outline" className="gap-1">
                        <ShieldCheck className="size-3.5" />
                        Gatekeeper decision
                      </Badge>
                    </div>

                    <h4 className="mt-3 text-lg font-semibold text-slate-900">
                      {result.title}
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {result.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}