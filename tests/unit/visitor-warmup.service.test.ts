import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

// Same reason as pre-call-briefing.service.test.ts: the client is only
// constructed when OPENAI_API_KEY is set at module evaluation time.
vi.hoisted(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

import { visitorWarmUpService } from "@/server/services/visitor-warmup.service";

const BASE_INPUT = {
  visitorName: "Jordan Rivera",
  professionalName: "Sarah Malik",
  serviceTitle: "Product Interview Prep",
  conversationHistory: [
    {
      role: "user",
      content:
        "I have a final-round PM interview at a fintech in 9 days and keep failing the product-sense case study.",
    },
  ],
};

function mockModelReply(content: string, tokens = 200) {
  mockCreate.mockResolvedValue({
    usage: { total_tokens: tokens },
    choices: [{ message: { content } }],
  });
}

describe("visitorWarmUpService", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("skips the API call when there's no conversation to draw on", async () => {
    const result = await visitorWarmUpService.generate({
      ...BASE_INPUT,
      conversationHistory: [],
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ note: null, tokensUsed: 0 });
  });

  it("skips the API call when the visitor said too little to be specific about", async () => {
    const result = await visitorWarmUpService.generate({
      ...BASE_INPUT,
      conversationHistory: [
        { role: "assistant", content: "Hi — what brings you here? Tell me a bit about your situation and goals." },
        { role: "user", content: "just want to chat" },
      ],
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ note: null, tokensUsed: 0 });
  });

  it("parses a valid note", async () => {
    mockModelReply(
      JSON.stringify({
        acknowledgement: "You've got a PM interview in 9 days and the case study is the sticking point.",
        prepPoints: ["A recent case study you struggled with", "  "],
      }),
      250,
    );

    const result = await visitorWarmUpService.generate(BASE_INPUT);

    expect(result).toEqual({
      note: {
        acknowledgement: "You've got a PM interview in 9 days and the case study is the sticking point.",
        prepPoints: ["A recent case study you struggled with"],
      },
      tokensUsed: 250,
    });
  });

  it("returns no note (but still reports tokens) when the model has nothing specific to say", async () => {
    mockModelReply(JSON.stringify({ acknowledgement: "", prepPoints: [] }), 90);

    const result = await visitorWarmUpService.generate(BASE_INPUT);

    expect(result).toEqual({ note: null, tokensUsed: 90 });
  });

  it("fails open to no note on non-JSON output", async () => {
    mockModelReply("not json", 42);

    const result = await visitorWarmUpService.generate(BASE_INPUT);

    expect(result).toEqual({ note: null, tokensUsed: 42 });
  });

  it("fails open to no note when the response breaks the schema", async () => {
    mockModelReply(
      JSON.stringify({
        acknowledgement: "ok",
        prepPoints: ["one", "two", "three", "four"],
      }),
    );

    const result = await visitorWarmUpService.generate(BASE_INPUT);

    expect(result.note).toBeNull();
  });

  it("fails open to no note when the OpenAI call throws", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));

    const result = await visitorWarmUpService.generate(BASE_INPUT);

    expect(result).toEqual({ note: null, tokensUsed: 0 });
  });
});
