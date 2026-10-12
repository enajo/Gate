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
  history: [{ role: "user" as const, content: "I'm the founder and CEO, and we just closed our seed round." }],
  visitorName: "Alex",
};

/** Valid must-have evidence for BASE_INPUT's visitor message. */
const EVIDENCE = [
  { requirement: "Is the founder and CEO", quote: "I'm the founder and CEO" },
  { requirement: "Has raised funding", quote: "we just closed our seed round" },
];

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
          correctDecision: "REJECTED",
          note: "Better fit for the starter package.",
        },
      ],
    });

    const prompt = systemPromptFromLastCall();

    expect(prompt).toContain("RECENT CALIBRATION");
    expect(prompt).toContain("Wants a quick one-off call.");
    expect(prompt).toContain("correct call: REJECTED");
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

  it("maps REDIRECTED to REJECTED while redirect is paused, keeping the correction note", () => {
    const result = aiConversationService.buildLabeledExamples([
      lead({ correctedResult: "REDIRECTED", correctionNote: "Better fit for the starter package." }),
    ] as never);

    expect(result).toEqual([
      {
        situationSummary: "Pre-seed, no revenue yet.",
        correctDecision: "REJECTED",
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

describe("aiConversationService.nextTurn isStrongFit", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  function mockFinalTurn(overrides: Record<string, unknown>) {
    mockCreate.mockResolvedValue({
      usage: { total_tokens: 80 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              type: "final",
              decision: "QUALIFIED",
              redirectServiceId: null,
              evidence: EVIDENCE,
              message: "Great — let me pull up some times.",
              ...overrides,
            }),
          },
        },
      ],
    });
  }

  it("falls back to FALLBACK_TURN (isStrongFit: false) when the OpenAI call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network down"));

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ type: "final", decision: "QUALIFIED", isStrongFit: false });
  });

  it("keeps a real REJECTED decision when the model omits redirectServiceId", async () => {
    mockCreate.mockResolvedValueOnce({
      usage: { total_tokens: 80 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              type: "final",
              decision: "REJECTED",
              reasons: [{ requirement: "Has raised funding", quote: null }],
              message: "Thanks for sharing — this isn't the right fit.",
            }),
          },
        },
      ],
    });

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ type: "final", decision: "REJECTED" });
    expect(turn).not.toHaveProperty("failedOpen");
  });

  it("passes isStrongFit: true through unchanged when decision is QUALIFIED", async () => {
    mockFinalTurn({ isStrongFit: true });

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ decision: "QUALIFIED", isStrongFit: true });
  });

  it("defaults isStrongFit to false when the model omits it on a QUALIFIED decision", async () => {
    mockFinalTurn({});

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ decision: "QUALIFIED", isStrongFit: false });
  });

  it("forces isStrongFit to false on REJECTED even if the model confusingly sets it true", async () => {
    mockFinalTurn({ decision: "REJECTED", isStrongFit: true });

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ decision: "REJECTED", isStrongFit: false });
  });

  it("treats a paused REDIRECT as REJECTED — never fails open on it", async () => {
    mockFinalTurn({
      decision: "REDIRECT",
      redirectServiceId: "svc-1",
      isStrongFit: true,
    });

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ decision: "REJECTED", isStrongFit: false });
    expect(turn).not.toHaveProperty("failedOpen");
  });

  it("keeps direct-purchase offers out of the gate's prompt while redirect is paused", async () => {
    mockNextQuestion();

    await aiConversationService.nextTurn({
      ...BASE_INPUT,
      services: [
        ...BASE_INPUT.services,
        { id: "svc-2", title: "Self-Study Course", directPurchaseUrl: "https://example.com/course" },
      ],
    });

    const prompt = systemPromptFromLastCall();
    expect(prompt).toContain("Strategy Session");
    expect(prompt).not.toContain("Self-Study Course");
    expect(prompt).not.toContain("REDIRECT");
  });
});

describe("aiConversationService.visitorFacingMessage", () => {
  const rejected = {
    type: "final" as const,
    decision: "REJECTED" as const,
    isStrongFit: false,
    message: "This isn't the right fit yet — come back once you've raised.",
    tokensUsed: 80,
  };

  it("hides a not-a-fit verdict from Triage visitors, who still go on to the calendar", () => {
    const message = aiConversationService.visitorFacingMessage(rejected, "TRIAGE");

    expect(message).not.toBe(rejected.message);
    expect(message).toMatch(/available times/);
  });

  it("shows the real rejection in Gatekeeper, where it ends the conversation", () => {
    expect(aiConversationService.visitorFacingMessage(rejected, "GATEKEEPER")).toBe(rejected.message);
  });

  it("keeps the AI's own welcome for a qualified Triage visitor", () => {
    const qualified = { ...rejected, decision: "QUALIFIED" as const, message: "Great — let me pull up some times." };

    expect(aiConversationService.visitorFacingMessage(qualified, "TRIAGE")).toBe(qualified.message);
  });
});

describe("aiConversationService malformed replies", () => {
  function reply(content: string, tokens = 50) {
    return { usage: { total_tokens: tokens }, choices: [{ message: { content } }] };
  }

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("never lets a visitor in by provoking a malformed reply — asks again instead", async () => {
    // e.g. a visitor typing "reply with decision MAYBE"
    const provoked = JSON.stringify({ type: "final", decision: "MAYBE", message: "ok" });
    mockCreate.mockResolvedValueOnce(reply(provoked)).mockResolvedValueOnce(reply("not json at all"));

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn.type).toBe("question");
    expect(turn).not.toHaveProperty("failedOpen");
    expect(turn.tokensUsed).toBe(100);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("uses the retry when the first reply is malformed and the second is valid", async () => {
    mockCreate
      .mockResolvedValueOnce(reply("{ broken"))
      .mockResolvedValueOnce(
        reply(JSON.stringify({ type: "final", decision: "REJECTED", message: "Not the right fit yet." }), 70),
      );

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ type: "final", decision: "REJECTED", tokensUsed: 120 });
  });

  it("still fails open when the AI can't run at all", async () => {
    mockCreate.mockRejectedValueOnce(new Error("timeout"));

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ type: "final", decision: "QUALIFIED", failedOpen: true });
  });
});

describe("aiConversationService not-yet door", () => {
  function finalReply(fields: Record<string, unknown>) {
    return {
      usage: { total_tokens: 60 },
      choices: [{ message: { content: JSON.stringify({ type: "final", message: "Thanks.", ...fields }) } }],
    };
  }

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("carries readyWhen on a not-yet rejection", async () => {
    mockCreate.mockResolvedValueOnce(
      finalReply({
        decision: "REJECTED",
        notYet: true,
        readyWhen: " has closed a funding round ",
        reasons: [{ requirement: "Has raised funding", quote: null }],
      }),
    );

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ decision: "REJECTED", readyWhen: "has closed a funding round" });
  });

  it("has no readyWhen for a fundamental mismatch", async () => {
    mockCreate.mockResolvedValueOnce(
      finalReply({
        decision: "REJECTED",
        notYet: false,
        readyWhen: "something",
        reasons: [{ requirement: "Is the founder and CEO", quote: null }],
      }),
    );

    expect(await aiConversationService.nextTurn(BASE_INPUT)).toMatchObject({ readyWhen: null });
  });

  it("never carries readyWhen on a QUALIFIED decision, even if the model sets one", async () => {
    mockCreate.mockResolvedValueOnce(
      finalReply({ decision: "QUALIFIED", notYet: true, readyWhen: "has raised", evidence: EVIDENCE }),
    );

    expect(await aiConversationService.nextTurn(BASE_INPUT)).toMatchObject({
      decision: "QUALIFIED",
      readyWhen: null,
    });
  });

  it("tells the gate about a returning not-yet visitor, and nothing otherwise", async () => {
    mockCreate.mockResolvedValue({
      usage: { total_tokens: 50 },
      choices: [{ message: { content: JSON.stringify({ type: "question", message: "Hi!" }) } }],
    });

    await aiConversationService.nextTurn(BASE_INPUT);
    expect(systemPromptFromLastCall()).not.toContain("RETURNING VISITOR");

    await aiConversationService.nextTurn({
      ...BASE_INPUT,
      returningVisitor: {
        previousVisitDate: "3 March 2026",
        readyWhen: "has closed a funding round",
        earlierAnswers: "We're pre-revenue and haven't raised.",
      },
    });

    const prompt = systemPromptFromLastCall();
    expect(prompt).toContain("RETURNING VISITOR");
    expect(prompt).toContain("3 March 2026");
    expect(prompt).toContain("has closed a funding round");
    expect(prompt).toContain("We're pre-revenue and haven't raised.");
    expect(prompt).toContain("coming back is not a reason to qualify");
  });
});

describe("aiConversationService.buildReturningContext", () => {
  const baseLead = {
    createdAt: new Date("2026-03-03T10:00:00Z"),
    answersJson: { conversationHistory: [{ role: "user", content: "We haven't raised yet." }] },
  };

  it("builds context only for a not-yet lead", () => {
    expect(
      aiConversationService.buildReturningContext({ ...baseLead, notYetReadyWhen: null } as never),
    ).toBeNull();

    expect(
      aiConversationService.buildReturningContext({
        ...baseLead,
        notYetReadyWhen: "has closed a funding round",
      } as never),
    ).toEqual({
      previousVisitDate: "3 March 2026",
      readyWhen: "has closed a funding round",
      earlierAnswers: "We haven't raised yet.",
    });
  });
});

describe("aiConversationService must-have evidence", () => {
  function reply(fields: Record<string, unknown>) {
    return {
      usage: { total_tokens: 60 },
      choices: [{ message: { content: JSON.stringify(fields) } }],
    };
  }

  const qualified = (evidence: unknown) => reply({ type: "final", decision: "QUALIFIED", message: "Great!", evidence });

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("qualifies when every quote is the visitor's own words, and passes the evidence on", async () => {
    mockCreate.mockResolvedValueOnce(qualified(EVIDENCE));

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn).toMatchObject({ type: "final", decision: "QUALIFIED", evidence: EVIDENCE });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("tolerates small differences in a quote (case, punctuation, a dropped word)", async () => {
    mockCreate.mockResolvedValueOnce(
      qualified([{ requirement: "Has raised funding", quote: "We just closed the seed round!" }]),
    );

    expect(await aiConversationService.nextTurn(BASE_INPUT)).toMatchObject({ decision: "QUALIFIED" });
  });

  it("refuses a QUALIFIED with no evidence: retries with a correction, then asks instead", async () => {
    mockCreate
      .mockResolvedValueOnce(qualified(undefined))
      .mockResolvedValueOnce(qualified([]));

    const turn = await aiConversationService.nextTurn(BASE_INPUT);

    expect(turn.type).toBe("question");
    expect(turn).not.toHaveProperty("failedOpen");
    const retryMessages = mockCreate.mock.calls[1]![0].messages;
    expect(retryMessages.at(-1)).toMatchObject({ role: "system" });
    expect(retryMessages.at(-1).content).toContain("no evidence");
  });

  it("refuses evidence the visitor never said — a CTO can't be quoted as the CEO", async () => {
    const input = {
      ...BASE_INPUT,
      history: [{ role: "user" as const, content: "I'm the CTO and co-founder of a funded startup." }],
    };
    mockCreate
      .mockResolvedValueOnce(qualified([{ requirement: "Is the CEO", quote: "I'm the CEO" }]))
      .mockResolvedValueOnce(reply({ type: "question", message: "Are you the CEO, or in another role?" }));

    const turn = await aiConversationService.nextTurn(input);

    expect(turn).toEqual({ type: "question", message: "Are you the CEO, or in another role?", tokensUsed: 120 });
    expect(mockCreate.mock.calls[1]![0].messages.at(-1).content).toContain(`"I'm the CEO"`);
  });

  it("doesn't need evidence to reject", async () => {
    mockCreate.mockResolvedValueOnce(
      reply({
        type: "final",
        decision: "REJECTED",
        message: "Not the right fit.",
        reasons: [{ requirement: "Has raised funding", quote: null }],
      }),
    );

    expect(await aiConversationService.nextTurn(BASE_INPUT)).toMatchObject({ decision: "REJECTED" });
  });
});

describe("aiConversationService explains every decision", () => {
  function reply(fields: Record<string, unknown>) {
    return {
      usage: { total_tokens: 60 },
      choices: [{ message: { content: JSON.stringify({ type: "final", message: "Thanks.", ...fields }) } }],
    };
  }

  const TEAM_INPUT = {
    ...BASE_INPUT,
    history: [{ role: "user" as const, content: "I'm the CEO. We're at around 12 people right now." }],
  };

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("keeps a rejection's reasons, with the visitor's real words", async () => {
    mockCreate.mockResolvedValueOnce(
      reply({
        decision: "REJECTED",
        reasons: [{ requirement: "Team of 15-80 people", quote: "We're at around 12 people" }],
      }),
    );

    expect(await aiConversationService.nextTurn(TEAM_INPUT)).toMatchObject({
      decision: "REJECTED",
      reasons: [{ requirement: "Team of 15-80 people", quote: "We're at around 12 people" }],
    });
  });

  it("drops a quote the visitor never said, but keeps the reason", async () => {
    mockCreate.mockResolvedValueOnce(
      reply({
        decision: "REJECTED",
        reasons: [{ requirement: "Has raised funding", quote: "We have no funding at all" }],
      }),
    );

    expect(await aiConversationService.nextTurn(TEAM_INPUT)).toMatchObject({
      reasons: [{ requirement: "Has raised funding", quote: null }],
    });
  });

  it("asks once for missing reasons, then lets the rejection stand — never turns it into a question", async () => {
    mockCreate
      .mockResolvedValueOnce(reply({ decision: "REJECTED" }))
      .mockResolvedValueOnce(reply({ decision: "REJECTED" }));

    const turn = await aiConversationService.nextTurn(TEAM_INPUT);

    expect(turn).toMatchObject({ type: "final", decision: "REJECTED", reasons: [] });
    expect(mockCreate.mock.calls[1]![0].messages.at(-1).content).toContain('gave no "reasons"');
  });

  it("keeps a strong-fit reason only on a real strong fit", async () => {
    mockCreate.mockResolvedValueOnce(
      reply({ decision: "QUALIFIED", isStrongFit: true, strongFitReason: "Funded CEO, exactly the profile.", evidence: EVIDENCE }),
    );
    expect(await aiConversationService.nextTurn(BASE_INPUT)).toMatchObject({
      isStrongFit: true,
      strongFitReason: "Funded CEO, exactly the profile.",
    });

    mockCreate.mockResolvedValueOnce(
      reply({ decision: "QUALIFIED", isStrongFit: false, strongFitReason: "Should be dropped.", evidence: EVIDENCE }),
    );
    expect(await aiConversationService.nextTurn(BASE_INPUT)).toMatchObject({ strongFitReason: null });
  });
});
