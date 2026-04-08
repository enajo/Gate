"use client";

import * as React from "react";

export type QualificationQuestion = {
  id: string;
  questionText: string;
  questionType:
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "NUMBER"
    | "MULTIPLE_CHOICE"
    | "YES_NO";
  helpText?: string | null;
  optionsJson?: string[] | null;
  sortOrder: number;
  isRequired: boolean;
};

export type QualificationRule = {
  id: string;
  priority: number;
  active: boolean;
  serviceId?: string | null;
  conditionsJson: {
    all?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    any?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  outcomeType: "ALLOW_BOOKING" | "REJECT" | "REDIRECT";
  outcomeValue?: string | null;
};

type QuestionsResponse = {
  questions?: QualificationQuestion[];
  question?: QualificationQuestion;
  error?: string;
};

type RulesResponse = {
  rules?: QualificationRule[];
  rule?: QualificationRule;
  error?: string;
};

export function useQualification() {
  const [questions, setQuestions] = React.useState<QualificationQuestion[]>([]);
  const [rules, setRules] = React.useState<QualificationRule[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadQualification = React.useCallback(async () => {
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

      const questionsData =
        (await questionsResponse.json()) as QuestionsResponse;
      const rulesData = (await rulesResponse.json()) as RulesResponse;

      if (!questionsResponse.ok) {
        throw new Error(
          questionsData?.error || "Failed to load qualification questions.",
        );
      }

      if (!rulesResponse.ok) {
        throw new Error(
          rulesData?.error || "Failed to load qualification rules.",
        );
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
    void loadQualification();
  }, [loadQualification]);

  async function createQuestion(
    input: Omit<QualificationQuestion, "id">,
  ) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/qualification/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as QuestionsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create question.");
      }

      if (data.question) {
        setQuestions((current) =>
          [...current, data.question!].sort((a, b) => a.sortOrder - b.sortOrder),
        );
      } else {
        await loadQualification();
      }

      return data.question ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create question.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateQuestion(
    id: string,
    input: Partial<QualificationQuestion>,
  ) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/qualification/questions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as QuestionsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update question.");
      }

      if (data.question) {
        setQuestions((current) =>
          current
            .map((item) => (item.id === id ? data.question! : item))
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );
      } else {
        await loadQualification();
      }

      return data.question ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update question.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteQuestion(id: string) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/qualification/questions/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as QuestionsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete question.");
      }

      setQuestions((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete question.",
      );
      throw deleteError;
    } finally {
      setIsSaving(false);
    }
  }

  async function createRule(input: Omit<QualificationRule, "id">) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/qualification/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as RulesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create rule.");
      }

      if (data.rule) {
        setRules((current) =>
          [...current, data.rule!].sort((a, b) => a.priority - b.priority),
        );
      } else {
        await loadQualification();
      }

      return data.rule ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create rule.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRule(id: string, input: Partial<QualificationRule>) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/qualification/rules/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as RulesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update rule.");
      }

      if (data.rule) {
        setRules((current) =>
          current
            .map((item) => (item.id === id ? data.rule! : item))
            .sort((a, b) => a.priority - b.priority),
        );
      } else {
        await loadQualification();
      }

      return data.rule ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update rule.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRule(id: string) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/qualification/rules/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as RulesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete rule.");
      }

      setRules((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete rule.",
      );
      throw deleteError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    questions,
    rules,
    isLoading,
    isSaving,
    error,
    refetch: loadQualification,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createRule,
    updateRule,
    deleteRule,
  };
}