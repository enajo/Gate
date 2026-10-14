import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email", () => ({
  EMAIL_FROM: "Gate <test@example.com>",
  resend: { emails: { send: mockSend } },
}));

import { emailService } from "@/server/services/email.service";

const HOSTILE = `Eve <a href="https://phish.example">click</a><script>alert(1)</script>`;

function sentEmail(): { subject: string; html: string } {
  expect(mockSend).toHaveBeenCalledTimes(1);
  return mockSend.mock.calls[0][0];
}

describe("emailService HTML escaping", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("escapes a rejected visitor's name and message, keeping line breaks", async () => {
    await emailService.sendRejectedVisitorContactProfessional({
      to: "pro@example.com",
      professionalName: "Sarah Malik",
      visitorName: HOSTILE,
      visitorEmail: "eve@example.com",
      serviceTitle: "Strategy Session",
      message: `Line one\n<img src=x onerror=alert(1)>`,
      appUrl: "http://localhost:3000",
    });

    const { html } = sentEmail();
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('<a href="https://phish.example">');
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Line one<br />&lt;img src=x onerror=alert(1)&gt;");
  });

  it("leaves the subject line as plain text (it's a header, not HTML)", async () => {
    await emailService.sendRejectedVisitorContactProfessional({
      to: "pro@example.com",
      professionalName: "Sarah Malik",
      visitorName: "Tom & Jerry",
      visitorEmail: "tj@example.com",
      serviceTitle: "Strategy Session",
      message: "hi",
      appUrl: "http://localhost:3000",
    });

    const { subject, html } = sentEmail();
    expect(subject).toBe("Message from Tom & Jerry (gate rejection)");
    expect(html).toContain("<title>Message from Tom &amp; Jerry (gate rejection)</title>");
  });

  it("escapes visitor-controlled channel names and AI-written text in the pattern report", async () => {
    await emailService.sendPatternReportProfessional({
      to: "pro@example.com",
      professionalName: "Sarah Malik",
      leadCount: 3,
      topRejectionReasons: ["<b>budget</b>"],
      commonObjections: [],
      suggestion: "Try <i>this</i>",
      channelBreakdown: [
        { channel: `"><script>x</script>`, leadCount: 3, qualifiedCount: 1, qualifiedRate: 1 / 3 },
      ],
    });

    const { html } = sentEmail();
    expect(html).not.toContain("<b>budget</b>");
    expect(html).not.toContain("<i>this</i>");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;b&gt;budget&lt;/b&gt;");
  });

  it("escapes visitor names in booking confirmations without double-escaping", async () => {
    await emailService.sendBookingConfirmedProfessional({
      to: "pro@example.com",
      professionalName: "Sarah Malik",
      visitorName: "Tom & Jerry",
      visitorEmail: "tj@example.com",
      serviceTitle: "Strategy Session",
      slotStart: new Date("2026-10-13T08:00:00Z"),
      slotEnd: new Date("2026-10-13T09:00:00Z"),
      timezone: "Europe/Berlin",
      appUrl: "http://localhost:3000",
    });

    const { html } = sentEmail();
    expect(html).toContain("Tom &amp; Jerry");
    expect(html).not.toContain("&amp;amp;");
  });
});

describe("emailService 'Want your own gate?' link", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("tags the visitor confirmation's link with the professional and the email source", async () => {
    await emailService.sendBookingConfirmedVisitor({
      to: "visitor@example.com",
      visitorName: "Dana",
      professionalName: "Sarah Malik",
      serviceTitle: "Interview Prep",
      slotStart: new Date("2026-11-02T10:00:00Z"),
      slotEnd: new Date("2026-11-02T10:45:00Z"),
      timezone: "UTC",
      holdId: "hold_1",
      appUrl: "https://gate.example",
      professionalSlug: "sarah-malik",
    });

    const { html } = sentEmail();
    expect(html).toContain('href="https://gate.example/?via=sarah-malik&src=email"');
    expect(html).toContain("Want your own gate?");
  });
});

describe("emailService weekly report: time protected", () => {
  const base = {
    to: "pro@example.com",
    professionalName: "Sarah Malik",
    leadCount: 12,
    topRejectionReasons: [],
    commonObjections: [],
    suggestion: "Ask about budget earlier.",
    channelBreakdown: [],
  };

  beforeEach(() => {
    mockSend.mockReset();
  });

  it("leads with the time protected when the gate kept calls off the calendar", async () => {
    await emailService.sendPatternReportProfessional({ ...base, timeProtected: { calls: 4, label: "3 hours" } });

    const { subject, html } = sentEmail();
    expect(subject).toBe("Your gate protected 3 hours this week");
    expect(html).toContain("3 hours protected");
    expect(html).toContain("4 calls that weren't the right fit");
  });

  it("keeps the usual subject and no section when nothing was protected", async () => {
    await emailService.sendPatternReportProfessional({ ...base, timeProtected: { calls: 0, label: "0 minutes" } });

    const { subject, html } = sentEmail();
    expect(subject).toBe("Your weekly gate report — 12 leads screened");
    expect(html).not.toContain("protected");
  });
});
