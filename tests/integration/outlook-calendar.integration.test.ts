import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors tests/integration/google-calendar.integration.test.ts's pattern —
// mock the repository and outlookAuthService, stub global fetch to control
// what Microsoft Graph returns.

const mockGoogleRepository = vi.hoisted(() => ({
  findCalendarAccountById: vi.fn(),
  updateCalendarAccountById: vi.fn(),
  touchLastSyncedAt: vi.fn(),
}));

const mockOutlookAuthService = vi.hoisted(() => ({
  decryptToken: vi.fn(() => "fake-access-token"),
  refreshAccessToken: vi.fn(),
  encryptOAuthTokens: vi.fn(),
}));

vi.mock("@/server/repositories/google.repository", () => ({
  googleRepository: mockGoogleRepository,
}));

vi.mock("@/server/services/outlook-auth.service", () => ({
  // OUTLOOK_PROVIDER is a module-level constant imported by
  // outlook-calendar.service — it must be present in the mock or the
  // service throws on import.
  OUTLOOK_PROVIDER: "OUTLOOK",
  outlookAuthService: mockOutlookAuthService,
}));

import { outlookCalendarService } from "@/server/services/outlook-calendar.service";

// ── Shared fixtures ──────────────────────────────────────────────────────────

const CALENDAR_ACCOUNT = {
  id: "calendar_account_1",
  professionalId: "professional_1",
  provider: "OUTLOOK",
  externalCalendarId: "AAMkAG...",
  externalAccountId: "outlook_account_1",
  calendarName: "Calendar",
  calendarTimeZone: "Europe/Berlin",
  providerEmail: "john@example.com",
  accessTokenEncrypted: "encrypted-access-token",
  refreshTokenEncrypted: "encrypted-refresh-token",
  isActive: true,
  syncStatus: "CONNECTED",
  lastSyncedAt: new Date("2026-04-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
};

function makeFetchResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("outlookCalendarService integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGoogleRepository.findCalendarAccountById.mockResolvedValue(CALENDAR_ACCOUNT);
    mockGoogleRepository.touchLastSyncedAt.mockResolvedValue(undefined);
    mockOutlookAuthService.decryptToken.mockReturnValue("fake-access-token");

    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── getBusyRangesForCalendarAccount — status filtering ──────────────────────

  describe("getBusyRangesForCalendarAccount", () => {
    it("includes busy and oof schedule items, excludes tentative and workingElsewhere", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({
          value: [
            {
              scheduleId: "john@example.com",
              scheduleItems: [
                {
                  status: "busy",
                  start: { dateTime: "2026-04-10T09:00:00.0000000" },
                  end: { dateTime: "2026-04-10T10:00:00.0000000" },
                },
                {
                  status: "oof",
                  start: { dateTime: "2026-04-10T11:00:00.0000000" },
                  end: { dateTime: "2026-04-10T12:00:00.0000000" },
                },
                {
                  status: "tentative",
                  start: { dateTime: "2026-04-10T13:00:00.0000000" },
                  end: { dateTime: "2026-04-10T14:00:00.0000000" },
                },
                {
                  status: "workingElsewhere",
                  start: { dateTime: "2026-04-10T15:00:00.0000000" },
                  end: { dateTime: "2026-04-10T16:00:00.0000000" },
                },
                {
                  status: "free",
                  start: { dateTime: "2026-04-10T17:00:00.0000000" },
                  end: { dateTime: "2026-04-10T18:00:00.0000000" },
                },
              ],
            },
          ],
        }),
      );

      const result = await outlookCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: "calendar_account_1",
        start: new Date("2026-04-10T00:00:00.000Z"),
        end: new Date("2026-04-11T00:00:00.000Z"),
        timezone: "Europe/Berlin",
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        start: new Date("2026-04-10T09:00:00.000Z"),
        end: new Date("2026-04-10T10:00:00.000Z"),
      });
      expect(result[1]).toMatchObject({
        start: new Date("2026-04-10T11:00:00.000Z"),
        end: new Date("2026-04-10T12:00:00.000Z"),
      });
    });

    it("sends the correct getSchedule request body to Microsoft Graph", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ value: [{ scheduleId: "john@example.com", scheduleItems: [] }] }),
      );

      await outlookCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: "calendar_account_1",
        start: new Date("2026-04-10T00:00:00.000Z"),
        end: new Date("2026-04-11T00:00:00.000Z"),
        timezone: "Europe/Berlin",
      });

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toContain("/me/calendar/getSchedule");
      expect(init?.method).toBe("POST");

      const body = JSON.parse(init?.body as string);
      expect(body).toMatchObject({
        schedules: ["john@example.com"],
        startTime: { dateTime: "2026-04-10T00:00:00.000Z" },
        endTime: { dateTime: "2026-04-11T00:00:00.000Z" },
      });
    });

    it("touches lastSyncedAt after a successful fetch", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ value: [{ scheduleId: "john@example.com", scheduleItems: [] }] }),
      );

      await outlookCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: "calendar_account_1",
        start: new Date("2026-04-10T00:00:00.000Z"),
        end: new Date("2026-04-11T00:00:00.000Z"),
        timezone: "Europe/Berlin",
      });

      expect(mockGoogleRepository.touchLastSyncedAt).toHaveBeenCalledWith(
        "calendar_account_1",
        "professional_1",
      );
    });
  });

  // ── createCalendarEvent ─────────────────────────────────────────────────────

  describe("createCalendarEvent", () => {
    it("creates an event and returns the event ID and URL", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({
          id: "outlook_event_1",
          webLink: "https://outlook.office.com/calendar/item/outlook_event_1",
        }),
      );

      const result = await outlookCalendarService.createCalendarEvent({
        calendarAccountId: "calendar_account_1",
        title: "Strategy Session",
        start: new Date("2026-04-10T10:00:00.000Z"),
        end: new Date("2026-04-10T10:45:00.000Z"),
        timeZone: "Europe/Berlin",
        attendees: [{ email: "sarah@example.com", displayName: "Sarah Founder" }],
      });

      expect(result.externalEventId).toBe("outlook_event_1");
      expect(result.eventUrl).toBe(
        "https://outlook.office.com/calendar/item/outlook_event_1",
      );
    });

    it("extracts the Teams meeting URL when a conferenceDataVersion is requested", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({
          id: "outlook_event_2",
          webLink: "https://outlook.office.com/calendar/item/outlook_event_2",
          onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" },
        }),
      );

      const result = await outlookCalendarService.createCalendarEvent({
        calendarAccountId: "calendar_account_1",
        title: "Strategy Session",
        start: new Date("2026-04-10T10:00:00.000Z"),
        end: new Date("2026-04-10T10:45:00.000Z"),
        timeZone: "Europe/Berlin",
        attendees: [],
        conferenceDataVersion: 1,
      });

      expect(result.meetingUrl).toBe("https://teams.microsoft.com/l/meetup-join/abc");

      const [, init] = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.isOnlineMeeting).toBe(true);
      expect(body.onlineMeetingProvider).toBe("teamsForBusiness");
    });

    it("throws when the Graph API returns a non-OK response", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ error: { message: "Calendar not found" } }, 404),
      );

      await expect(
        outlookCalendarService.createCalendarEvent({
          calendarAccountId: "calendar_account_1",
          title: "Strategy Session",
          start: new Date("2026-04-10T10:00:00.000Z"),
          end: new Date("2026-04-10T10:45:00.000Z"),
          timeZone: "Europe/Berlin",
          attendees: [],
        }),
      ).rejects.toThrow("Calendar not found");
    });
  });

  // ── 401 retry — refresh token always rotates ────────────────────────────────

  describe("token refresh on 401", () => {
    it("retries once after refreshing, and persists the rotated refresh token unconditionally", async () => {
      vi.mocked(fetch)
        .mockReturnValueOnce(makeFetchResponse({ error: { message: "Unauthorized" } }, 401))
        .mockReturnValueOnce(
          makeFetchResponse({ value: [{ scheduleId: "john@example.com", scheduleItems: [] }] }),
        );

      mockOutlookAuthService.refreshAccessToken.mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });
      mockOutlookAuthService.encryptOAuthTokens.mockReturnValue({
        accessTokenEncrypted: "encrypted-new-access-token",
        refreshTokenEncrypted: "encrypted-new-refresh-token",
      });
      mockGoogleRepository.updateCalendarAccountById.mockResolvedValue({
        ...CALENDAR_ACCOUNT,
        accessTokenEncrypted: "encrypted-new-access-token",
        refreshTokenEncrypted: "encrypted-new-refresh-token",
      });

      await outlookCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: "calendar_account_1",
        start: new Date("2026-04-10T00:00:00.000Z"),
        end: new Date("2026-04-11T00:00:00.000Z"),
        timezone: "Europe/Berlin",
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(mockGoogleRepository.updateCalendarAccountById).toHaveBeenCalledWith(
        "calendar_account_1",
        expect.objectContaining({
          accessTokenEncrypted: "encrypted-new-access-token",
          // No `?? account.refreshTokenEncrypted` fallback — Microsoft
          // always rotates, so this must be the new value, not kept old.
          refreshTokenEncrypted: "encrypted-new-refresh-token",
        }),
      );
    });
  });
});
