import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const mockCreate = vi.hoisted(() => vi.fn());
const mockNextTurn = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

vi.mock("@/server/services/ai-conversation.service", () => ({
  aiConversationService: { nextTurn: mockNextTurn },
}));

import { gateTestService, type GateTestInput } from "@/server/services/gate-test.service";

const BASE_INPUT: GateTestInput = {
  professionalName: "Jordan Rivera",
  professionalTitle: "Executive Coach",
  professionalBio: null,
  services: [
    { id: "svc-1", title: "Strategy Session", idealPersonaDescription: "Series A founders scaling a team." },
    { id: "svc-2", title: "Starter Course", directPurchaseUrl: "https://example.com/course" },
  ],
  targetServiceId: "svc-1",
  archetype: "IDEAL",
  variant: 0,
};

const PERSONA = {
  name: "Sam K.",
  summary: "Founder of a 30-person startup, just raised a Series A.",
  backstory: "Sam runs a fast-growing startup and needs help building a leadership team.",
};

function completion(content: string, tokens = 100) {
  return { usage: { total_tokens: tokens }, choices: [{ message: { content } }] };
}

/** First OpenAI call is the persona; every later one is a simulated visitor reply. */
function mockPersonaThenReplies() {
  mockCreate.mockResolvedValueOnce(completion(JSON.stringify(PERSONA)));
  mockCreate.mockResolvedValue(completion("We just closed our Series A and need to hire fast.", 40));
}

function question(message = "What brings you here?") {
  return { type: "question", message, tokensUsed: 50 };
}

function final(decision: "QUALIFIED" | "REJECTED", overrides: Record<string, unknown> = {}) {
  return {
    type: "final",
    decision,
    isStrongFit: false,
    message: "Thanks — that's all I need.",
    tokensUsed: 60,
    ...overrides,
  };
}

describe("gateTestService.runSimulatedVisitor", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockNextTurn.mockReset();
    mockPersonaThenReplies();
  });

  it("runs the conversation through the real gate and marks a qualified ideal client as expected", async () => {
    mockNextTurn
      .mockResolvedValueOnce(question())
      .mockResolvedValueOnce(final("QUALIFIED", { isStrongFit: true }));

    const result = await gateTestService.runSimulatedVisitor(BASE_INPUT);

    expect(result.outcome).toBe("QUALIFIED");
    expect(result.isStrongFit).toBe(true);
    expect(result.verdict).toBe("AS_EXPECTED");
    expect(result.persona).toEqual({ name: PERSONA.name, summary: PERSONA.summary });
    expect(result.transcript.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    // persona 100 + question 50 + reply 40 + final 60
    expect(result.tokensUsed).toBe(250);
  });

  it("passes the persona name and growing history to the gate", async () => {
    mockNextTurn
      .mockResolvedValueOnce(question("First?"))
      .mockResolvedValueOnce(final("QUALIFIED"));

    await gateTestService.runSimulatedVisitor(BASE_INPUT);

    const secondCall = mockNextTurn.mock.calls[1]![0];
    expect(secondCall.visitorName).toBe("Sam K.");
    expect(secondCall.targetServiceId).toBe("svc-1");
    expect(secondCall.history).toHaveLength(2);
  });

  it("flips roles for the simulated visitor so the gate's questions arrive as the user", async () => {
    mockNextTurn
      .mockResolvedValueOnce(question("What brings you here?"))
      .mockResolvedValueOnce(final("QUALIFIED"));

    await gateTestService.runSimulatedVisitor(BASE_INPUT);

    const visitorCall = mockCreate.mock.calls[1]![0];
    expect(visitorCall.messages[0].role).toBe("system");
    expect(visitorCall.messages[1]).toEqual({ role: "user", content: "What brings you here?" });
  });

  it("flags an ideal client the gate rejected", async () => {
    mockNextTurn.mockResolvedValueOnce(question()).mockResolvedValueOnce(final("REJECTED"));

    const result = await gateTestService.runSimulatedVisitor(BASE_INPUT);

    expect(result.verdict).toBe("CHECK_THIS");
  });

  it("flags a wrong-fit visitor the gate let in", async () => {
    mockNextTurn.mockResolvedValueOnce(question()).mockResolvedValueOnce(final("QUALIFIED"));

    const result = await gateTestService.runSimulatedVisitor({ ...BASE_INPUT, archetype: "MISMATCH" });

    expect(result.verdict).toBe("CHECK_THIS");
  });

  it("leaves borderline visitors as a close call whatever the outcome", async () => {
    mockNextTurn.mockResolvedValueOnce(question()).mockResolvedValueOnce(final("REJECTED"));

    const result = await gateTestService.runSimulatedVisitor({ ...BASE_INPUT, archetype: "BORDERLINE" });

    expect(result.verdict).toBe("CLOSE_CALL");
  });

  it("reports a fail-open fallback as GATE_ERROR, never as QUALIFIED", async () => {
    mockNextTurn
      .mockResolvedValueOnce(question())
      .mockResolvedValueOnce({ ...final("QUALIFIED"), tokensUsed: 0, failedOpen: true });

    const result = await gateTestService.runSimulatedVisitor(BASE_INPUT);

    expect(result.outcome).toBe("GATE_ERROR");
    expect(result.verdict).toBe("CHECK_THIS");
    expect(result.isStrongFit).toBe(false);
    // The fallback's canned "great fit" message was never the AI's judgment.
    expect(result.transcript.map((m) => m.role)).toEqual(["assistant", "user"]);
  });

  it("stops after six gate turns without a decision, without generating an unread reply", async () => {
    mockNextTurn.mockResolvedValue(question());

    const result = await gateTestService.runSimulatedVisitor(BASE_INPUT);

    expect(result.outcome).toBe("NO_DECISION");
    expect(result.verdict).toBe("CHECK_THIS");
    expect(mockNextTurn).toHaveBeenCalledTimes(6);
    // 1 persona + 5 visitor replies
    expect(mockCreate).toHaveBeenCalledTimes(6);
    expect(result.transcript.at(-1)?.role).toBe("assistant");
  });

  it("throws a plain Error (not ZodError) when the persona comes back malformed", async () => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValueOnce(completion(JSON.stringify({ name: "Sam" })));

    const error = await gateTestService.runSimulatedVisitor(BASE_INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ZodError);
    expect(mockNextTurn).not.toHaveBeenCalled();
  });
});

describe("gateTestService.withDraftGate", () => {
  const services = [
    { id: "svc-1", title: "Strategy Session", idealPersonaDescription: "old prompt" },
    { id: "svc-2", title: "Starter Course" },
  ];

  it("swaps the draft prompt into a saved service", () => {
    const merged = gateTestService.withDraftGate(services, {
      serviceId: "svc-1",
      idealPersonaDescription: "draft prompt",
    });

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ id: "svc-1", idealPersonaDescription: "draft prompt" });
    expect(merged[1]).toBe(services[1]);
  });

  it("appends an unsaved draft service so the gate still has a target", () => {
    const merged = gateTestService.withDraftGate(services, {
      serviceId: "draft-123",
      title: "New Offer",
      idealPersonaDescription: "draft prompt",
    });

    expect(merged).toHaveLength(3);
    expect(merged[2]).toEqual({
      id: "draft-123",
      title: "New Offer",
      idealPersonaDescription: "draft prompt",
    });
  });
});
