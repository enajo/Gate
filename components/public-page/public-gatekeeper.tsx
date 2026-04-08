"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GatekeeperQuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "MULTIPLE_CHOICE"
  | "YES_NO";

type GatekeeperQuestion = {
  id: string;
  questionText: string;
  questionType: GatekeeperQuestionType;
  helpText?: string | null;
  optionsJson?: string[] | null;
  isRequired?: boolean;
};

type QualificationEvaluation = {
  result: "QUALIFIED" | "REJECTED" | "REDIRECTED";
  outcomeType: "ALLOW_BOOKING" | "REJECT" | "REDIRECT";
  outcomeValue?: string | null;
  matchedRuleId?: string | null;
};

type QualificationLead = {
  id: string;
  name: string;
  email: string;
};

type QualificationResponse = {
  lead: QualificationLead;
  evaluation: QualificationEvaluation;
};

type SubmittedPayload = QualificationResponse & {
  answers: Record<string, unknown>;
};

export interface PublicGatekeeperProps
  extends React.HTMLAttributes<HTMLElement> {
  professionalId: string;
  serviceId: string | null;
  questions: GatekeeperQuestion[];
  title?: string;
  description?: string;
  serviceTitle?: string;
  submitLabel?: string;
  acceptedCtaLabel?: string;
  acceptedCtaHref?: string;
  rejectedTitle?: string;
  rejectedDescription?: string;
  redirectLabel?: string;
  stepByStep?: boolean;
  onSubmitted?: (payload: SubmittedPayload) => void;
  onQualified?: (payload: SubmittedPayload) => void;
  onRejected?: (payload: SubmittedPayload) => void;
}

type FormState = {
  name: string;
  email: string;
  answers: Record<string, unknown>;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  answers: {},
};

function isLikelyUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeAnswerForSubmit(
  value: unknown,
  questionType: GatekeeperQuestionType,
) {
  if (questionType === "NUMBER") {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (questionType === "YES_NO") {
    if (value === "true" || value === true) {
      return true;
    }

    if (value === "false" || value === false) {
      return false;
    }

    return null;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function getQuestionValue(
  answers: Record<string, unknown>,
  questionId: string,
) {
  return answers[questionId] ?? "";
}

function isBlank(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  );
}

function getResultCopy(
  evaluation: QualificationEvaluation,
  defaults: {
    rejectedTitle: string;
    rejectedDescription: string;
  },
) {
  if (evaluation.result === "QUALIFIED") {
    return {
      title: "You’re a fit",
      description:
        "You’ve passed the qualification step. You can continue to booking.",
    };
  }

  if (evaluation.result === "REDIRECTED") {
    return {
      title: "A better next step is available",
      description:
        evaluation.outcomeValue && !isLikelyUrl(evaluation.outcomeValue)
          ? evaluation.outcomeValue
          : "Based on your answers, we’re recommending a different next step before booking.",
    };
  }

  return {
    title: defaults.rejectedTitle,
    description:
      evaluation.outcomeValue && !isLikelyUrl(evaluation.outcomeValue)
        ? evaluation.outcomeValue
        : defaults.rejectedDescription,
  };
}

export function PublicGatekeeper({
  className,
  professionalId,
  serviceId,
  questions,
  title = "Apply before you can book",
  description = "Answer a few quick questions so only the right-fit people reach the calendar.",
  serviceTitle,
  submitLabel = "Continue",
  acceptedCtaLabel = "Continue to booking",
  acceptedCtaHref = "#booking",
  rejectedTitle = "This isn’t the right fit right now",
  rejectedDescription = "Based on your answers, booking is not available at the moment.",
  redirectLabel = "View next step",
  stepByStep = true,
  onSubmitted,
  onQualified,
  onRejected,
  ...props
}: PublicGatekeeperProps) {
  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<QualificationResponse | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const steps = React.useMemo(() => {
    const base = [
      {
        id: "identity",
        label: "Your details",
        render: "identity" as const,
      },
      ...questions.map((question) => ({
        id: question.id,
        label: question.questionText,
        render: "question" as const,
        question,
      })),
    ];

    return stepByStep
      ? base
      : [
          {
            id: "all",
            label: "Application",
            render: "all" as const,
          },
        ];
  }, [questions, stepByStep]);

  const totalSteps = steps.length;
  const activeStep = steps[currentStep];

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateAnswer(questionId: string, value: unknown) {
    setForm((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value,
      },
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function validateIdentity() {
    const nextErrors: Record<string, string> = {};

    if (isBlank(form.name)) {
      nextErrors.name = "Name is required.";
    }

    if (isBlank(form.email)) {
      nextErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));

    return Object.keys(nextErrors).length === 0;
  }

  function validateQuestion(question: GatekeeperQuestion) {
    const rawValue = getQuestionValue(form.answers, question.id);
    const value = normalizeAnswerForSubmit(rawValue, question.questionType);

    if (question.isRequired !== false && isBlank(value)) {
      setErrors((prev) => ({
        ...prev,
        [question.id]: "This question is required.",
      }));
      return false;
    }

    return true;
  }

  function validateAll() {
    let valid = validateIdentity();

    for (const question of questions) {
      const questionValid = validateQuestion(question);
      if (!questionValid) {
        valid = false;
      }
    }

    return valid;
  }

  function handleNext() {
    if (!stepByStep) {
      return;
    }

    if (activeStep.render === "identity" && !validateIdentity()) {
      return;
    }

    if (
      activeStep.render === "question" &&
      activeStep.question &&
      !validateQuestion(activeStep.question)
    ) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!serviceId) {
      setSubmitError("Select a service before continuing.");
      return;
    }

    const isValid = stepByStep
      ? activeStep.render === "identity"
        ? validateIdentity()
        : activeStep.render === "question" && activeStep.question
          ? validateQuestion(activeStep.question)
          : validateAll()
      : validateAll();

    if (!isValid) {
      return;
    }

    if (stepByStep && currentStep < totalSteps - 1) {
      handleNext();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const answers = Object.fromEntries(
        questions.map((question) => [
          question.id,
          normalizeAnswerForSubmit(
            getQuestionValue(form.answers, question.id),
            question.questionType,
          ),
        ]),
      );

      const response = await fetch("/api/public/qualification/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId,
          serviceId,
          name: form.name.trim(),
          email: form.email.trim(),
          answers,
        }),
      });

      const data = (await response.json()) as
        | QualificationResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit qualification.");
      }

      const payload: SubmittedPayload = {
        ...(data as QualificationResponse),
        answers,
      };

      setResult(data as QualificationResponse);
      onSubmitted?.(payload);

      if (payload.evaluation.result === "QUALIFIED") {
        onQualified?.(payload);
      } else {
        onRejected?.(payload);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit qualification.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderQuestion(question: GatekeeperQuestion) {
    const value = getQuestionValue(form.answers, question.id);
    const error = errors[question.id];

    return (
      <div key={question.id} className="space-y-3">
        <div className="space-y-1">
          <Label error={!!error}>
            {question.questionText}
            {question.isRequired !== false ? " *" : ""}
          </Label>

          {question.helpText ? (
            <p className="text-sm text-slate-500">{question.helpText}</p>
          ) : null}
        </div>

        {question.questionType === "SHORT_TEXT" ? (
          <Input
            value={String(value ?? "")}
            error={!!error}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
            placeholder="Type your answer"
          />
        ) : null}

        {question.questionType === "LONG_TEXT" ? (
          <Textarea
            value={String(value ?? "")}
            error={!!error}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
            placeholder="Type your answer"
          />
        ) : null}

        {question.questionType === "NUMBER" ? (
          <Input
            type="number"
            value={String(value ?? "")}
            error={!!error}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
            placeholder="Enter a number"
          />
        ) : null}

        {question.questionType === "MULTIPLE_CHOICE" ? (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(nextValue) => updateAnswer(question.id, nextValue)}
          >
            <SelectTrigger error={!!error}>
              <SelectValue placeholder="Choose an option" />
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
            onValueChange={(nextValue) => updateAnswer(question.id, nextValue)}
          >
            <SelectTrigger error={!!error}>
              <SelectValue placeholder="Select yes or no" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    );
  }

  const resultCopy = result
    ? getResultCopy(result.evaluation, {
        rejectedTitle,
        rejectedDescription,
      })
    : null;

  return (
    <section
      id="gatekeeper"
      className={cn("border-b border-slate-200 bg-slate-50/50", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="size-3.5" />
            Gatekeeper
          </Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {description}
          </p>

          {serviceTitle ? (
            <p className="mt-4 text-sm font-medium text-slate-500">
              Applying for: <span className="text-slate-900">{serviceTitle}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-12">
          {!result ? (
            <Card className="mx-auto max-w-3xl rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>
                      {stepByStep ? `Step ${currentStep + 1} of ${totalSteps}` : "Application"}
                    </CardTitle>
                    <CardDescription>
                      {stepByStep
                        ? "Answer a few questions to see whether booking is available."
                        : "Complete the short application below."}
                    </CardDescription>
                  </div>

                  {stepByStep ? (
                    <div className="text-sm font-medium text-slate-500">
                      {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                    </div>
                  ) : null}
                </div>

                {stepByStep ? (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{
                        width: `${((currentStep + 1) / totalSteps) * 100}%`,
                      }}
                    />
                  </div>
                ) : null}
              </CardHeader>

              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {stepByStep && activeStep.render === "identity" ? (
                    <>
                      <div className="space-y-2">
                        <Label error={!!errors.name}>Your name *</Label>
                        <Input
                          value={form.name}
                          error={!!errors.name}
                          onChange={(event) =>
                            updateField("name", event.target.value)
                          }
                          placeholder="Enter your full name"
                        />
                        {errors.name ? (
                          <p className="text-sm font-medium text-red-600">
                            {errors.name}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label error={!!errors.email}>Your email *</Label>
                        <Input
                          type="email"
                          value={form.email}
                          error={!!errors.email}
                          onChange={(event) =>
                            updateField("email", event.target.value)
                          }
                          placeholder="Enter your email"
                        />
                        {errors.email ? (
                          <p className="text-sm font-medium text-red-600">
                            {errors.email}
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {stepByStep &&
                  activeStep.render === "question" &&
                  activeStep.question
                    ? renderQuestion(activeStep.question)
                    : null}

                  {!stepByStep ? (
                    <>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label error={!!errors.name}>Your name *</Label>
                          <Input
                            value={form.name}
                            error={!!errors.name}
                            onChange={(event) =>
                              updateField("name", event.target.value)
                            }
                            placeholder="Enter your full name"
                          />
                          {errors.name ? (
                            <p className="text-sm font-medium text-red-600">
                              {errors.name}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label error={!!errors.email}>Your email *</Label>
                          <Input
                            type="email"
                            value={form.email}
                            error={!!errors.email}
                            onChange={(event) =>
                              updateField("email", event.target.value)
                            }
                            placeholder="Enter your email"
                          />
                          {errors.email ? (
                            <p className="text-sm font-medium text-red-600">
                              {errors.email}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {questions.map((question) => renderQuestion(question))}
                      </div>
                    </>
                  ) : null}

                  {submitError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {stepByStep ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 0 || isSubmitting}
                      >
                        <ChevronLeft className="size-4" />
                        Back
                      </Button>
                    ) : (
                      <div />
                    )}

                    <Button type="submit" disabled={isSubmitting || !serviceId}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Submitting...
                        </>
                      ) : stepByStep && currentStep < totalSteps - 1 ? (
                        <>
                          {submitLabel}
                          <ArrowRight className="size-4" />
                        </>
                      ) : (
                        <>
                          {submitLabel}
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="mx-auto max-w-3xl rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full",
                      result.evaluation.result === "QUALIFIED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    {result.evaluation.result === "QUALIFIED" ? (
                      <CheckCircle2 className="size-7" />
                    ) : (
                      <XCircle className="size-7" />
                    )}
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    {resultCopy?.title}
                  </h3>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    {resultCopy?.description}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {result.evaluation.result === "QUALIFIED" ? (
                      <Button asChild size="lg">
                        <Link href={acceptedCtaHref}>
                          {acceptedCtaLabel}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ) : null}

                    {result.evaluation.result === "REDIRECTED" &&
                    isLikelyUrl(result.evaluation.outcomeValue) ? (
                      <Button asChild size="lg" variant="outline">
                        <Link href={result.evaluation.outcomeValue!}>
                          {redirectLabel}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setResult(null);
                        setSubmitError(null);
                      }}
                    >
                      Start again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}