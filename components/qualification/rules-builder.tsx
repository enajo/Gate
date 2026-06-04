"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type QualificationOutcomeType =
  | "ALLOW_BOOKING"
  | "REJECT"
  | "REDIRECT";

export type QualificationConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in";

export type QualificationQuestionOption = {
  id: string;
  label: string;
  type?: "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "MULTIPLE_CHOICE" | "YES_NO";
};

export type QualificationConditionItem = {
  field: string;
  operator: QualificationConditionOperator;
  value: string;
};

export type QualificationRuleValue = {
  id: string;
  priority: number;
  active: boolean;
  serviceId?: string | null;
  conditionsJson: {
    all?: QualificationConditionItem[];
    any?: QualificationConditionItem[];
  };
  outcomeType: QualificationOutcomeType;
  outcomeValue?: string | null;
};

export interface RulesBuilderProps {
  className?: string;
  rules: QualificationRuleValue[];
  questions: QualificationQuestionOption[];
  onChange?: (rules: QualificationRuleValue[]) => void;
  onCreate?: () => void;
  createLabel?: string;
}

const operatorOptions: Array<{
  value: QualificationConditionOperator;
  label: string;
}> = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Does not equal" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "Is one of" },
];

const outcomeOptions: Array<{
  value: QualificationOutcomeType;
  label: string;
}> = [
  { value: "ALLOW_BOOKING", label: "Allow booking" },
  { value: "REJECT", label: "Reject" },
  { value: "REDIRECT", label: "Redirect" },
];

function createEmptyCondition(): QualificationConditionItem {
  return {
    field: "",
    operator: "eq",
    value: "",
  };
}

function getPrimaryConditions(rule: QualificationRuleValue) {
  if (rule.conditionsJson.all?.length) {
    return {
      group: "all" as const,
      items: rule.conditionsJson.all,
    };
  }

  return {
    group: "any" as const,
    items: rule.conditionsJson.any ?? [],
  };
}

function getQuestionLabel(
  questions: QualificationQuestionOption[],
  id: string,
) {
  return questions.find((question) => question.id === id)?.label || "Unknown question";
}

function getOutcomeDescription(rule: QualificationRuleValue) {
  if (rule.outcomeType === "ALLOW_BOOKING") {
    return "Qualified leads will unlock slot selection and booking.";
  }

  if (rule.outcomeType === "REJECT") {
    return rule.outcomeValue || "Leads will see a polite rejection message.";
  }

  return rule.outcomeValue || "Leads will be redirected to another resource or URL.";
}

export function RulesBuilder({
  className,
  rules,
  questions,
  onChange,
  onCreate,
  createLabel = "Add rule",
  ...props
}: RulesBuilderProps) {
  function updateRules(nextRules: QualificationRuleValue[]) {
    onChange?.(nextRules);
  }

  function addRule() {
    const nextRules = [
      ...rules,
      {
        id: crypto.randomUUID(),
        priority: rules.length + 1,
        active: true,
        conditionsJson: {
          all: [createEmptyCondition()],
        },
        outcomeType: "ALLOW_BOOKING" as QualificationOutcomeType,
        outcomeValue: "",
      },
    ];

    updateRules(nextRules);
    onCreate?.();
  }

  function removeRule(ruleId: string) {
    const nextRules = rules
      .filter((rule) => rule.id !== ruleId)
      .map((rule, index) => ({
        ...rule,
        priority: index + 1,
      }));

    updateRules(nextRules);
  }

  function updateRule(
    ruleId: string,
    patch: Partial<QualificationRuleValue>,
  ) {
    const nextRules = rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...patch } : rule,
    );

    updateRules(nextRules);
  }

  function updateConditionGroup(
    ruleId: string,
    group: "all" | "any",
  ) {
    const nextRules = rules.map((rule) => {
      if (rule.id !== ruleId) {
        return rule;
      }

      const current = getPrimaryConditions(rule).items;
      return {
        ...rule,
        conditionsJson:
          group === "all"
            ? { all: current.length ? current : [createEmptyCondition()] }
            : { any: current.length ? current : [createEmptyCondition()] },
      };
    });

    updateRules(nextRules);
  }

  function updateCondition(
    ruleId: string,
    index: number,
    patch: Partial<QualificationConditionItem>,
  ) {
    const nextRules = rules.map((rule) => {
      if (rule.id !== ruleId) {
        return rule;
      }

      const { group, items } = getPrimaryConditions(rule);
      const nextItems = items.map((condition, itemIndex) =>
        itemIndex === index ? { ...condition, ...patch } : condition,
      );

      return {
        ...rule,
        conditionsJson: group === "all" ? { all: nextItems } : { any: nextItems },
      };
    });

    updateRules(nextRules);
  }

  function addCondition(ruleId: string) {
    const nextRules = rules.map((rule) => {
      if (rule.id !== ruleId) {
        return rule;
      }

      const { group, items } = getPrimaryConditions(rule);
      const nextItems = [...items, createEmptyCondition()];

      return {
        ...rule,
        conditionsJson: group === "all" ? { all: nextItems } : { any: nextItems },
      };
    });

    updateRules(nextRules);
  }

  function removeCondition(ruleId: string, index: number) {
    const nextRules = rules.map((rule) => {
      if (rule.id !== ruleId) {
        return rule;
      }

      const { group, items } = getPrimaryConditions(rule);
      const nextItems = items.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...rule,
        conditionsJson:
          group === "all"
            ? { all: nextItems.length ? nextItems : [createEmptyCondition()] }
            : { any: nextItems.length ? nextItems : [createEmptyCondition()] },
      };
    });

    updateRules(nextRules);
  }

  if (!rules.length) {
    return (
      <EmptyState
        className={className}
        title="No qualification rules yet"
        description="Rules decide who gets access to booking, who gets rejected, and who gets redirected elsewhere."
        action={
          <Button type="button" onClick={addRule}>
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
            Decision rules
          </h3>
          <p className="text-sm text-slate-500">
            Define how answers map to allow, reject, or redirect outcomes.
          </p>
        </div>

        <Button type="button" onClick={addRule}>
          <Plus className="size-4" />
          {createLabel}
        </Button>
      </div>

      <div className="space-y-4">
        {rules
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((rule) => {
            const { group, items } = getPrimaryConditions(rule);

            return (
              <Card key={rule.id} className="rounded-2xl">
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Priority #{rule.priority}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                            rule.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600">
                        {items.length > 0
                          ? `${group === "all" ? "All" : "Any"} of these conditions must match.`
                          : "Add conditions to define this rule."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          updateRule(rule.id, { active: !rule.active })
                        }
                      >
                        {rule.active ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeRule(rule.id)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.35fr_0.65fr]">
                    <div className="space-y-2">
                      <Label>Condition group</Label>
                      <Select
                        value={group}
                        onValueChange={(value) =>
                          updateConditionGroup(rule.id, value as "all" | "any")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Match all conditions</SelectItem>
                          <SelectItem value="any">Match any condition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Outcome</Label>
                      <Select
                        value={rule.outcomeType}
                        onValueChange={(value) =>
                          updateRule(rule.id, {
                            outcomeType: value as QualificationOutcomeType,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {outcomeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Conditions
                        </p>
                        <p className="text-sm text-slate-500">
                          Match answers from the Gatekeeper form.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addCondition(rule.id)}
                      >
                        <Plus className="size-4" />
                        Add condition
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {items.map((condition, index) => (
                        <div
                          key={`${rule.id}-${index}`}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[0.38fr_0.26fr_0.26fr_auto]"
                        >
                          <div className="space-y-2">
                            <Label>Question</Label>
                            <Select
                              value={condition.field}
                              onValueChange={(value) =>
                                updateCondition(rule.id, index, { field: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select question" />
                              </SelectTrigger>
                              <SelectContent>
                                {questions.map((question) => (
                                  <SelectItem key={question.id} value={question.id}>
                                    {question.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) =>
                                updateCondition(rule.id, index, {
                                  operator:
                                    value as QualificationConditionOperator,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operatorOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              value={condition.value}
                              onChange={(event) =>
                                updateCondition(rule.id, index, {
                                  value: event.target.value,
                                })
                              }
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => removeCondition(rule.id, index)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
                    <div className="space-y-2">
                      <Label>Outcome value</Label>
                      <Input
                        value={rule.outcomeValue ?? ""}
                        onChange={(event) =>
                          updateRule(rule.id, {
                            outcomeValue: event.target.value,
                          })
                        }
                        placeholder={
                          rule.outcomeType === "REDIRECT"
                            ? "https://example.com/resource"
                            : rule.outcomeType === "REJECT"
                              ? "This session is currently reserved for active SaaS founders."
                              : "Optional"
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Rule preview
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        If {group === "all" ? "all" : "any"} of these conditions
                        match:
                      </p>

                      <ul className="mt-3 space-y-2">
                        {items.map((condition, index) => (
                          <li
                            key={`${condition.field}-${index}`}
                            className="text-sm text-slate-600"
                          >
                            <span className="font-medium text-slate-900">
                              {condition.field
                                ? getQuestionLabel(questions, condition.field)
                                : "Select a question"}
                            </span>{" "}
                            · {condition.operator} ·{" "}
                            {condition.value || "enter a value"}
                          </li>
                        ))}
                      </ul>

                      <p className="mt-4 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">
                          Outcome:
                        </span>{" "}
                        {getOutcomeDescription(rule)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}