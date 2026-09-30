import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

import { aiConversationService } from "@/server/services/ai-conversation.service";

const BASE_INPUT = {
  professionalName: "Jordan Rivera",
  professionalTitle: "Executive Coach",
  professionalBio: null,
  services: [{ id: "svc-1", title: "Strategy Session" }],
  targetServiceId: "svc-1",
  history: [],
  visitorName: "Alex",
};

function mockNextQuestion() {
  mockCreate.mockResolvedValue({
    usage: { total_tokens: 50 },
    choices: [
      { message: { content: JSON.stringify({ type: "question", message: "Hi!" }) } },
    ],
  });
}

function systemPromptFromLastCall(): string {
  const call = mockCreate.mock.calls.at(-1)?.[0];
  return call.messages[0].content as string;
}

describe("aiConversationService calibration block", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockNextQuestion();
  });

  it("omits calibration when no labeled examples are given", async () => {
    await aiConversationService.nextTurn(BASE_INPUT);

    expect(systemPromptFromLastCall()).not.toContain("RECENT CALIBRATION");
  });

  it("omits calibration below the minimum sample size", async () => {
    await aiConversationService.nextTurn({
      ...BASE_INPUT,
      labeledExamples: [
        { situationSummary: "Wants a quick one-off call.", correctDecision: "REJECTED" },
        { situationSummary: "Scaling a Series A team.", correctDecision: "QUALIFIED" },
      ],
    });

    expect(systemPromptFromLastCall()).not.toContain("RECENT CALIBRATION");
  });

  it("includes calibration once the minimum sample size is met", async () => {
    await aiConversationService.nextTurn({
      ...BASE_INPUT,
      labeledExamples: [
        { situationSummary: "Wants a quick one-off call.", correctDecision: "REJECTED" },
        { situationSummary: "Scaling a Series A team.", correctDecision: "QUALIFIED" },
        {
          situationSummary: "Early-stage, pre-funding.",
          correctDecision: "REDIRECT",
          note: "Better fit for the starter package.",
        },
      ],
    });

    const prompt = systemPromptFromLastCall();

    expect(prompt).toContain("RECENT CALIBRATION");
    expect(prompt).toContain("Wants a quick one-off call.");
    expect(prompt).toContain("correct call: REJECTED");
    expect(prompt).toContain("correct call: REDIRECT");
    expect(prompt).toContain("Better fit for the starter package.");
  });
});

describe("aiConversationService.buildLabeledExamples", () => {
  function lead(overrides: Record<string, unknown>) {
    return {
      answersJson: { conversationHistory: [{ role: "user", content: "Pre-seed, no revenue yet." }] },
      correctedResult: "QUALIFIED",
      correctionNote: null,
      ...overrides,
    };
  }

  it("skips leads that were never reviewed", () => {
    const result = aiConversationService.buildLabeledExamples([
      lead({ correctedResult: null }),
    ] as never);

    expect(result).toEqual([]);
  });

  it("skips the unused PENDING_REVIEW state defensively", () => {
    const result = aiConversationService.buildLabeledExamples([
      lead({ correctedResult: "PENDING_REVIEW" }),
    ] as never);

    expect(result).toEqual([]);
  });

  it("skips leads with no usable transcript", () => {
    const result = aiConversationService.buildLabeledExamples([
      lead({ answersJson: { conversationHistory: [] } }),
      lead({ answersJson: null }),
    ] as never);

    expect(result).toEqual([]);
  });

  it("maps REDIRECTED to REDIRECT and carries the correction note through", () => {
    const result = aiConversationService.buildLabeledExamples([
      lead({ correctedResult: "REDIRECTED", correctionNote: "Better fit for the starter package." }),
    ] as never);

    expect(result).toEqual([
      {
        situationSummary: "Pre-seed, no revenue yet.",
        correctDecision: "REDIRECT",
        note: "Better fit for the starter package.",
      },
    ]);
  });

  it("falls back to the token-exhausted fail-open path's answersJson shape", () => {
    const result = aiConversationService.buildLabeledExamples([
      lead({ answersJson: { history: [{ role: "user", content: "Just exploring options." }] } }),
    ] as never);

    expect(result[0]?.situationSummary).toBe("Just exploring options.");
  });
});
