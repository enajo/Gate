import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

// The service only constructs an OpenAI client when OPENAI_API_KEY is set —
// must land before the service module is evaluated, so it goes through
// vi.hoisted (specially hoisted above static imports by Vitest) rather than
// a plain top-level statement, which ES module import hoisting would still
// beat.
vi.hoisted(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

import { preCallBriefingService } from "@/server/services/pre-call-briefing.service";

const BASE_INPUT = {
  clientName: "Jordan Rivera",
  serviceName: "Strategy Session",
  conversationHistory: [
    { role: "user", content: "I have an interview in 9 days and keep failing the case study." },
  ],
};

describe("preCallBriefingService", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("skips the API call and returns an empty briefing when there's no conversation history", async () => {
    const result = await preCallBriefingService.generate({
      ...BASE_INPUT,
      conversationHistory: [],
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toEqual({
      summary: "",
      keyPoints: [],
      suggestedOpening: "",
      tokensUsed: 0,
    });
  });

  it("fails open to an empty briefing when the model returns non-JSON", async () => {
    mockCreate.mockResolvedValue({
      usage: { total_tokens: 42 },
      choices: [{ message: { content: "not json" } }],
    });

    const result = await preCallBriefingService.generate(BASE_INPUT);

    expect(result.summary).toBe("");
    expect(result.tokensUsed).toBe(42);
  });

  it("fails open to an empty briefing when the OpenAI call throws", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));

    const result = await preCallBriefingService.generate(BASE_INPUT);

    expect(result).toEqual({
      summary: "",
      keyPoints: [],
      suggestedOpening: "",
      tokensUsed: 0,
    });
  });

  it("parses a valid model response", async () => {
    mockCreate.mockResolvedValue({
      usage: { total_tokens: 250 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "Preparing for a big interview.",
              keyPoints: ["Interview in 9 days"],
              suggestedOpening: "How's the prep going?",
            }),
          },
        },
      ],
    });

    const result = await preCallBriefingService.generate(BASE_INPUT);

    expect(result).toEqual({
      summary: "Preparing for a big interview.",
      keyPoints: ["Interview in 9 days"],
      suggestedOpening: "How's the prep going?",
      tokensUsed: 250,
    });
  });
});
