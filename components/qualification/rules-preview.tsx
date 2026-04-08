import * as React from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import type {
  QualificationConditionItem,
  QualificationQuestionOption,
  QualificationRuleValue,
} from "@/components/qualification/rules-builder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RulesPreviewProps
  extends React.HTMLAttributes<HTMLDivElement> {
  rules: QualificationRuleValue[];
  questions: QualificationQuestionOption[];
  title?: string;
  description?: string;
}

function getQuestionLabel(
  questions: QualificationQuestionOption[],
  id: string,
) {
  return questions.find((question) => question.id === id)?.label || "Unknown question";
}

function getOperatorLabel(operator: QualificationConditionItem["operator"]) {
  switch (operator) {
    case "eq":
      return "equals";
    case "neq":
      return "does not equal";
    case "gt":
      return "is greater than";
    case "gte":
      return "is greater than or equal to";
    case "lt":
      return "is less than";
    case "lte":
      return "is less than or equal to";
    case "contains":
      return "contains";
    case "in":
      return "is one of";
    default:
      return operator;
  }
}

function getOutcomeBadgeVariant(outcomeType: QualificationRuleValue["outcomeType"]) {
  switch (outcomeType) {
    case "ALLOW_BOOKING":
      return "success";
    case "REJECT":
      return "destructive";
    case "REDIRECT":
      return "warning";
    default:
      return "secondary";
  }
}

function getOutcomeLabel(outcomeType: QualificationRuleValue["outcomeType"]) {
  switch (outcomeType) {
    case "ALLOW_BOOKING":
      return "Allow booking";
    case "REJECT":
      return "Reject";
    case "REDIRECT":
      return "Redirect";
    default:
      return outcomeType;
  }
}

function getOutcomeIcon(outcomeType: QualificationRuleValue["outcomeType"]) {
  switch (outcomeType) {
    case "ALLOW_BOOKING":
      return CheckCircle2;
    case "REJECT":
      return XCircle;
    case "REDIRECT":
      return ArrowRight;
    default:
      return ShieldCheck;
  }
}

function getConditions(rule: QualificationRuleValue) {
  if (rule.conditionsJson.all?.length) {
    return {
      mode: "all" as const,
      items: rule.conditionsJson.all,
    };
  }

  return {
    mode: "any" as const,
    items: rule.conditionsJson.any ?? [],
  };
}

export function RulesPreview({
  className,
  rules,
  questions,
  title = "Decision flow preview",
  description = "This is how your rule logic will appear conceptually in the Gatekeeper engine.",
  ...props
}: RulesPreviewProps) {
  const sortedRules = rules
    .slice()
    .sort((a, b) => a.priority - b.priority);

  if (!sortedRules.length) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-4">
        {sortedRules.map((rule) => {
          const { mode, items } = getConditions(rule);
          const OutcomeIcon = getOutcomeIcon(rule.outcomeType);

          return (
            <Card
              key={rule.id}
              className={cn(
                "rounded-2xl border-slate-200 shadow-sm",
                !rule.active && "opacity-70",
              )}
            >
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Priority #{rule.priority}</Badge>
                    <Badge variant={rule.active ? "success" : "secondary"}>
                      {rule.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={getOutcomeBadgeVariant(rule.outcomeType)}>
                      {getOutcomeLabel(rule.outcomeType)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <OutcomeIcon className="size-4" />
                    <span>
                      Match {mode === "all" ? "all conditions" : "any condition"}
                    </span>
                  </div>
                </div>

                <CardTitle className="text-base">
                  Rule {rule.priority}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    If {mode === "all" ? "all" : "any"} of these are true
                  </p>

                  <ul className="mt-3 space-y-2">
                    {items.length > 0 ? (
                      items.map((condition, index) => (
                        <li
                          key={`${rule.id}-${index}`}
                          className="text-sm leading-6 text-slate-600"
                        >
                          <span className="font-medium text-slate-900">
                            {condition.field
                              ? getQuestionLabel(questions, condition.field)
                              : "Select a question"}
                          </span>{" "}
                          {getOperatorLabel(condition.operator)}{" "}
                          <span className="font-medium text-slate-900">
                            {condition.value || "—"}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-400">
                        No conditions configured yet.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Then
                  </p>

                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        rule.outcomeType === "ALLOW_BOOKING" &&
                          "bg-emerald-100 text-emerald-700",
                        rule.outcomeType === "REJECT" &&
                          "bg-red-100 text-red-700",
                        rule.outcomeType === "REDIRECT" &&
                          "bg-amber-100 text-amber-700",
                      )}
                    >
                      <OutcomeIcon className="size-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {getOutcomeLabel(rule.outcomeType)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {rule.outcomeValue?.trim()
                          ? rule.outcomeValue
                          : rule.outcomeType === "ALLOW_BOOKING"
                            ? "Qualified leads will move forward to slot selection."
                            : rule.outcomeType === "REJECT"
                              ? "Leads will see a polite rejection message."
                              : "Leads will be redirected to another page or resource."}
                      </p>
                    </div>
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