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

import {
  buildChannelBreakdown,
  patternReportService,
} from "@/server/services/pattern-report.service";

describe("buildChannelBreakdown", () => {
  it("groups by utmSource when present, falling back to referrer hostname, falling back to Direct", () => {
    const result = buildChannelBreakdown([
      { qualificationResult: "QUALIFIED", utmSource: "newsletter" },
      { qualificationResult: "QUALIFIED", referrer: "https://www.linkedin.com/feed" },
      { qualificationResult: "REJECTED", referrer: "not a url" },
      { qualificationResult: "REJECTED" },
    ]);

    const byChannel = Object.fromEntries(result.map((c) => [c.channel, c]));

    expect(byChannel["newsletter"]).toMatchObject({ leadCount: 1, qualifiedCount: 1 });
    expect(byChannel["linkedin.com"]).toMatchObject({ leadCount: 1, qualifiedCount: 1 });
    expect(byChannel["Direct"]).toMatchObject({ leadCount: 2, qualifiedCount: 0 });
  });

  it("uses the professional's correction over the AI's original call as ground truth", () => {
    const result = buildChannelBreakdown([
      { qualificationResult: "REJECTED", correctedResult: "QUALIFIED", utmSource: "twitter" },
      { qualificationResult: "QUALIFIED", correctedResult: "REJECTED", utmSource: "twitter" },
    ]);

    expect(result).toEqual([
      { channel: "twitter", leadCount: 2, qualifiedCount: 1, qualifiedRate: 0.5 },
    ]);
  });

  it("sorts channels with a reliable sample size (3+ leads) ahead of small-sample channels", () => {
    const result = buildChannelBreakdown([
      // 1 lead, 100% qualified — looks great but isn't reliable
      { qualificationResult: "QUALIFIED", utmSource: "lucky-channel" },
      // 4 leads, 50% qualified — a real, if less flattering, pattern
      { qualificationResult: "QUALIFIED", utmSource: "linkedin" },
      { qualificationResult: "REJECTED", utmSource: "linkedin" },
      { qualificationResult: "QUALIFIED", utmSource: "linkedin" },
      { qualificationResult: "REJECTED", utmSource: "linkedin" },
    ]);

    expect(result.map((c) => c.channel)).toEqual(["linkedin", "lucky-channel"]);
  });

  it("returns an empty array for no leads", () => {
    expect(buildChannelBreakdown([])).toEqual([]);
  });
});

describe("patternReportService.generate channel breakdown merging", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  const LEADS = [
    { qualificationResult: "QUALIFIED", utmSource: "linkedin" },
    { qualificationResult: "REJECTED", utmSource: "twitter" },
  ];

  it("includes the channel breakdown even when the model returns non-JSON (fails open)", async () => {
    mockCreate.mockResolvedValue({
      usage: { total_tokens: 10 },
      choices: [{ message: { content: "not json" } }],
    });

    const result = await patternReportService.generate("Jordan Rivera", LEADS);

    expect(result.channelBreakdown).toEqual([
      { channel: "linkedin", leadCount: 1, qualifiedCount: 1, qualifiedRate: 1 },
      { channel: "twitter", leadCount: 1, qualifiedCount: 0, qualifiedRate: 0 },
    ]);
  });

  it("includes the channel breakdown alongside a successful AI narrative", async () => {
    mockCreate.mockResolvedValue({
      usage: { total_tokens: 120 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              topRejectionReasons: ["Budget mismatch"],
              commonObjections: [],
              suggestion: "",
            }),
          },
        },
      ],
    });

    const result = await patternReportService.generate("Jordan Rivera", LEADS);

    expect(result.topRejectionReasons).toEqual(["Budget mismatch"]);
    expect(result.channelBreakdown.length).toBe(2);
  });

  it("includes the channel breakdown even when OPENAI_API_KEY is unset", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    vi.resetModules();
    process.env.OPENAI_API_KEY = "";

    const { patternReportService: freshService } = await import(
      "@/server/services/pattern-report.service"
    );

    const result = await freshService.generate("Jordan Rivera", LEADS);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result.channelBreakdown.length).toBe(2);

    process.env.OPENAI_API_KEY = originalKey;
  });
});
