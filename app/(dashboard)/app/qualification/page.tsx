"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { QuestionBuilder, type QualificationQuestionItem } from "@/components/qualification/question-builder";
import { QuestionForm, type QuestionFormValues } from "@/components/qualification/question-form";
import { QualificationFlow } from "@/components/qualification/qualification-flow";
import { RulesBuilder, type QualificationQuestionOption, type QualificationRuleValue } from "@/components/qualification/rules-builder";
import { RulesPreview } from "@/components/qualification/rules-preview";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QuestionsResponse = {
  questions?: QualificationQuestionItem[];
  question?: QualificationQuestionItem;
  error?: string;
};

type RulesResponse = {
  rules?: QualificationRuleValue[];
  rule?: QualificationRuleValue;
  error?: string;
};

export default function QualificationPage() {
  const [questions, setQuestions] = React.useState<QualificationQuestionItem[]>([]);
  const [rules, setRules] = React.useState<QualificationRuleValue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingQuestion, setIsSavingQuestion] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [questionDialogOpen, setQuestionDialogOpen] = React.useState(false);
  const [questionDialogMode, setQuestionDialogMode] = React.useState<"create" | "edit">("create");
  const [selectedQuestion, setSelectedQuestion] =
    React.useState<QualificationQuestionItem | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [questionsResponse, rulesResponse] = await Promise.all([
        fetch("/api/app/qualification/questions", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/app/qualification/rules", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const questionsData = (await questionsResponse.json()) as QuestionsResponse;
      const rulesData = (await rulesResponse.json()) as RulesResponse;

      if (!questionsResponse.ok) {
        throw new Error(questionsData?.error || "Failed to load qualification questions.");
      }

      if (!rulesResponse.ok) {
        throw new Error(rulesData?.error || "Failed to load qualification rules.");
      }

      setQuestions(
        (questionsData.questions ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setRules((rulesData.rules ?? []).sort((a, b) => a.priority - b.priority));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load qualification settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const questionOptions = React.useMemo<QualificationQuestionOption[]>(
    () =>
      questions.map((question) => ({
        id: question.id,
        label: question.questionText,
        type: question.questionType,
      })),
    [questions],
  );

  function openCreateQuestionDialog() {
    setQuestionDialogMode("create");
    setSelectedQuestion(null);
    setQuestionDialogOpen(true);
  }

  function openEditQuestionDialog(question: QualificationQuestionItem) {
    setQuestionDialogMode("edit");
    setSelectedQuestion(question);
    setQuestionDialogOpen(true);
  }

  async function handleQuestionSubmit(values: QuestionFormValues) {
    setIsSavingQuestion(true);
    setError(null);

    try {
      const isEdit = questionDialogMode === "edit" && selectedQuestion?.id;
      const endpoint = isEdit
        ? `/api/app/qualification/questions/${selectedQuestion.id}`
        : "/api/app/qualification/questions";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as QuestionsResponse;

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to ${isEdit ? "update" : "create"} qualification question.`,
        );
      }

      if (data.question) {
        setQuestions((current) => {
          const next = isEdit
            ? current.map((item) =>
                item.id === data.question!.id ? data.question! : item,
              )
            : [...current, data.question!];

          return next.sort((a, b) => a.sortOrder - b.sortOrder);
        });
      } else {
        await loadData();
      }

      setQuestionDialogOpen(false);
      setSelectedQuestion(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save qualification question.",
      );
      throw saveError;
    } finally {
      setIsSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(question: QualificationQuestionItem) {
    setError(null);

    try {
      const response = await fetch(
        `/api/app/qualification/questions/${question.id}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as QuestionsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete qualification question.");
      }

      setQuestions((current) =>
        current.filter((item) => item.id !== question.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete qualification question.",
      );
    }
  }

  async function handleRulesChange(nextRules: QualificationRuleValue[]) {
    setRules(nextRules);
  }

  async function persistRule(
    rule: QualificationRuleValue,
    existingIds: Set<string>,
  ) {
    const isExisting = existingIds.has(rule.id);
    const endpoint = isExisting
      ? `/api/app/qualification/rules/${rule.id}`
      : "/api/app/qualification/rules";
    const method = isExisting ? "PATCH" : "POST";

    const payload = {
      serviceId: rule.serviceId ?? null,
      conditionsJson: rule.conditionsJson,
      outcomeType: rule.outcomeType,
      outcomeValue: rule.outcomeValue ?? "",
      priority: rule.priority,
      active: rule.active,
    };

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as RulesResponse;

    if (!response.ok) {
      throw new Error(
        data?.error ||
          `Failed to ${isExisting ? "update" : "create"} qualification rule.`,
      );
    }

    return data.rule ?? null;
  }

  async function handleSaveRules(nextRules: QualificationRuleValue[]) {
    setError(null);

    try {
      const existingIds = new Set(rules.map((rule) => rule.id));
      const nextIds = new Set(nextRules.map((rule) => rule.id));
      const deletedRules = rules.filter((rule) => !nextIds.has(rule.id));

      for (const deletedRule of deletedRules) {
        const response = await fetch(
          `/api/app/qualification/rules/${deletedRule.id}`,
          { method: "DELETE" },
        );

        const data = (await response.json()) as RulesResponse;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to delete qualification rule.");
        }
      }

      const persistedRules: QualificationRuleValue[] = [];

      for (const rule of nextRules) {
        const persisted = await persistRule(rule, existingIds);
        persistedRules.push(persisted ?? rule);
      }

      setRules(persistedRules.sort((a, b) => a.priority - b.priority));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save qualification rules.",
      );
    }
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Qualification"
          description="Build your Gatekeeper by defining what questions clients answer and what logic decides whether they can book."
          maxWidth="full"
        />
      }
      actions={
        <Button type="button" onClick={openCreateQuestionDialog}>
          <Plus className="size-4" />
          Add question
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading qualification flow"
          description="Please wait while we fetch your questions and rules."
        />
      ) : error && questions.length === 0 && rules.length === 0 ? (
        <ErrorState
          inset
          title="Could not load qualification flow"
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

          <QuestionBuilder
            questions={questions}
            onCreate={openCreateQuestionDialog}
            onEdit={openEditQuestionDialog}
            onDelete={handleDeleteQuestion}
          />

          <RulesBuilder
            rules={rules}
            questions={questionOptions}
            onChange={handleRulesChange}
          />

          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleSaveRules(rules)}>
              Save rules
            </Button>
          </div>

          <RulesPreview rules={rules} questions={questionOptions} />

          <QualificationFlow questions={questions} rules={rules} />
        </div>
      )}

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {questionDialogMode === "edit"
                ? "Edit qualification question"
                : "Create qualification question"}
            </DialogTitle>
            <DialogDescription>
              Define the question clients answer before they can unlock booking.
            </DialogDescription>
          </DialogHeader>

          <QuestionForm
            initialValues={selectedQuestion ?? undefined}
            isSubmitting={isSavingQuestion}
            submitLabel={
              questionDialogMode === "edit" ? "Save changes" : "Create question"
            }
            onSubmit={handleQuestionSubmit}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}