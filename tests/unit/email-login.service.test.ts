import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  upsertForEmail: vi.fn(),
  recordFailedAttempt: vi.fn(),
  consume: vi.fn(),
  deleteById: vi.fn(),
  upsertVerifiedUser: vi.fn(),
}));

const mockEmailService = vi.hoisted(() => ({ sendLoginCode: vi.fn() }));

// Mutable so each test can flip environment / Resend availability.
const mockEnv = vi.hoisted(() => ({ NODE_ENV: "development" as string }));
const mockEmailLib = vi.hoisted(() => ({ resend: {} as object | null, EMAIL_FROM: "x" }));

vi.mock("@/server/repositories/email-login-code.repository", () => ({
  emailLoginCodeRepository: mockRepo,
}));
vi.mock("@/server/services/email.service", () => ({ emailService: mockEmailService }));
vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/email", () => mockEmailLib);

import { hmacSign } from "@/lib/crypto";
import { emailLoginService } from "@/server/services/email-login.service";

const NOW = new Date("2026-10-10T09:00:00.000Z");
const EMAIL = "pro@example.com";

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "code_1",
    email: EMAIL,
    codeHash: hmacSign(`${EMAIL}:123456`, "email-login-code"),
    expiresAt: new Date(NOW.getTime() + 5 * 60_000),
    attempts: 0,
    createdAt: new Date(NOW.getTime() - 2 * 60_000),
    ...overrides,
  };
}

describe("emailLoginService.requestCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.NODE_ENV = "development";
    mockEmailLib.resend = {};
    mockRepo.findByEmail.mockResolvedValue(null);
  });

  it("stores only a hash of a 6-digit code, expiring in 10 minutes, and emails the code", async () => {
    const result = await emailLoginService.requestCode("  Pro@Example.com ", NOW);

    expect(result).toEqual({ ok: true });
    const stored = mockRepo.upsertForEmail.mock.calls[0][0];
    const sent = mockEmailService.sendLoginCode.mock.calls[0][0];

    expect(stored.email).toBe(EMAIL);
    expect(sent.to).toBe(EMAIL);
    expect(sent.code).toMatch(/^\d{6}$/);
    expect(stored.codeHash).not.toContain(sent.code);
    expect(stored.codeHash).toBe(hmacSign(`${EMAIL}:${sent.code}`, "email-login-code"));
    expect(stored.expiresAt).toEqual(new Date(NOW.getTime() + 10 * 60_000));
  });

  it("doesn't send another email within the 30-second resend cooldown", async () => {
    mockRepo.findByEmail.mockResolvedValue(
      storedRow({ createdAt: new Date(NOW.getTime() - 10_000) }),
    );

    const result = await emailLoginService.requestCode(EMAIL, NOW);

    expect(result).toEqual({ ok: true });
    expect(mockRepo.upsertForEmail).not.toHaveBeenCalled();
    expect(mockEmailService.sendLoginCode).not.toHaveBeenCalled();
  });

  it("refuses in production when Resend isn't configured, rather than faking a sent code", async () => {
    mockEnv.NODE_ENV = "production";
    mockEmailLib.resend = null;

    const result = await emailLoginService.requestCode(EMAIL, NOW);

    expect(result).toEqual({ ok: false, reason: "email_unavailable" });
    expect(mockRepo.upsertForEmail).not.toHaveBeenCalled();
  });

  it("in development without Resend, stores the code without trying to email it", async () => {
    mockEmailLib.resend = null;

    const result = await emailLoginService.requestCode(EMAIL, NOW);

    expect(result).toEqual({ ok: true });
    expect(mockRepo.upsertForEmail).toHaveBeenCalled();
    expect(mockEmailService.sendLoginCode).not.toHaveBeenCalled();
  });
});

describe("emailLoginService.verifyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findByEmail.mockResolvedValue(storedRow());
    mockRepo.consume.mockResolvedValue(true);
    mockRepo.upsertVerifiedUser.mockResolvedValue({ id: "user_1", email: EMAIL, name: "pro" });
  });

  it("signs in with the right code and consumes it", async () => {
    const user = await emailLoginService.verifyCode("PRO@example.com", "123 456", NOW);

    expect(user).toEqual({ id: "user_1", email: EMAIL, name: "pro" });
    expect(mockRepo.consume).toHaveBeenCalledWith("code_1", storedRow().codeHash);
    expect(mockRepo.upsertVerifiedUser).toHaveBeenCalledWith(EMAIL);
  });

  it("rejects a wrong code and records the failed attempt", async () => {
    const user = await emailLoginService.verifyCode(EMAIL, "654321", NOW);

    expect(user).toBeNull();
    expect(mockRepo.recordFailedAttempt).toHaveBeenCalledWith("code_1", 5);
    expect(mockRepo.consume).not.toHaveBeenCalled();
  });

  it("rejects even the right code once 5 attempts are used up, and burns it", async () => {
    mockRepo.findByEmail.mockResolvedValue(storedRow({ attempts: 5 }));

    const user = await emailLoginService.verifyCode(EMAIL, "123456", NOW);

    expect(user).toBeNull();
    expect(mockRepo.deleteById).toHaveBeenCalledWith("code_1");
    expect(mockRepo.upsertVerifiedUser).not.toHaveBeenCalled();
  });

  it("rejects an expired code and deletes it", async () => {
    mockRepo.findByEmail.mockResolvedValue(
      storedRow({ expiresAt: new Date(NOW.getTime() - 1) }),
    );

    const user = await emailLoginService.verifyCode(EMAIL, "123456", NOW);

    expect(user).toBeNull();
    expect(mockRepo.deleteById).toHaveBeenCalledWith("code_1");
  });

  it("rejects a code that a parallel request already used", async () => {
    mockRepo.consume.mockResolvedValue(false);

    const user = await emailLoginService.verifyCode(EMAIL, "123456", NOW);

    expect(user).toBeNull();
    expect(mockRepo.upsertVerifiedUser).not.toHaveBeenCalled();
  });

  it("rejects malformed codes without touching the database", async () => {
    expect(await emailLoginService.verifyCode(EMAIL, "12345", NOW)).toBeNull();
    expect(mockRepo.findByEmail).not.toHaveBeenCalled();
  });

  it("rejects an email with no pending code", async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    expect(await emailLoginService.verifyCode(EMAIL, "123456", NOW)).toBeNull();
  });
});
