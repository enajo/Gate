import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// googleCalendarService now uses native fetch + googleRepository directly —
// no googleapis client. Mock the repository and googleAuthService, then
// stub the global fetch to control what Google's API returns.

const mockGoogleRepository = vi.hoisted(() => ({
  findCalendarAccountById: vi.fn(),
  updateCalendarAccountById: vi.fn(),
  touchLastSyncedAt: vi.fn(),
}));

const mockGoogleAuthService = vi.hoisted(() => ({
  decryptToken: vi.fn(() => "fake-access-token"),
  refreshAccessToken: vi.fn(),
  encryptOAuthTokens: vi.fn(),
}));

vi.mock("@/server/repositories/google.repository", () => ({
  googleRepository: mockGoogleRepository,
}));

vi.mock("@/server/services/google-auth.service", () => ({
  // GOOGLE_PROVIDER is a module-level constant imported by google-calendar.service;
  // it must be present in the mock object or the service will throw on import.
  GOOGLE_PROVIDER: "GOOGLE",
  googleAuthService: mockGoogleAuthService,
}));

import { googleCalendarService } from "@/server/services/google-calendar.service";

// ── Shared fixtures ──────────────────────────────────────────────────────────

const CALENDAR_ACCOUNT = {
  id: "calendar_account_1",
  professionalId: "professional_1",
  provider: "GOOGLE",
  externalCalendarId: "primary",
  externalAccountId: "google_account_1",
  calendarName: "Primary Calendar",
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

describe("googleCalendarService integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGoogleRepository.findCalendarAccountById.mockResolvedValue(CALENDAR_ACCOUNT);
    mockGoogleRepository.touchLastSyncedAt.mockResolvedValue(undefined);
    mockGoogleAuthService.decryptToken.mockReturnValue("fake-access-token");

    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── getBusyRangesForCalendarAccount ─────────────────────────────────────────

  describe("getBusyRangesForCalendarAccount", () => {
    it("returns merged busy ranges from the Google freebusy API", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({
          calendars: {
            primary: {
              busy: [
                { start: "2026-04-10T09:00:00.000Z", end: "2026-04-10T10:00:00.000Z" },
                { start: "2026-04-10T13:00:00.000Z", end: "2026-04-10T14:00:00.000Z" },
              ],
            },
          },
        }),
      );

      const result = await googleCalendarService.getBusyRangesForCalendarAccount({
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
        start: new Date("2026-04-10T13:00:00.000Z"),
        end: new Date("2026-04-10T14:00:00.000Z"),
      });
    });

    it("sends the correct freebusy request body to Google", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ calendars: { primary: { busy: [] } } }),
      );

      await googleCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: "calendar_account_1",
        start: new Date("2026-04-10T00:00:00.000Z"),
        end: new Date("2026-04-11T00:00:00.000Z"),
        timezone: "Europe/Berlin",
      });

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toContain("/freeBusy");
      expect(init?.method).toBe("POST");

      const body = JSON.parse(init?.body as string);
      expect(body).toMatchObject({
        timeMin: "2026-04-10T00:00:00.000Z",
        timeMax: "2026-04-11T00:00:00.000Z",
        timeZone: "Europe/Berlin",
        items: [{ id: "primary" }],
      });
    });

    it("returns an empty array when the calendar has no busy times", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ calendars: { primary: { busy: [] } } }),
      );

      const result = await googleCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: "calendar_account_1",
        start: new Date("2026-04-10T00:00:00.000Z"),
        end: new Date("2026-04-11T00:00:00.000Z"),
        timezone: "Europe/Berlin",
      });

      expect(result).toEqual([]);
    });

    it("touches lastSyncedAt after a successful fetch", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ calendars: { primary: { busy: [] } } }),
      );

      await googleCalendarService.getBusyRangesForCalendarAccount({
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
          id: "google_event_1",
          htmlLink: "https://calendar.google.com/event?eid=google_event_1",
        }),
      );

      const result = await googleCalendarService.createCalendarEvent({
        calendarAccountId: "calendar_account_1",
        title: "Strategy Session",
        start: new Date("2026-04-10T10:00:00.000Z"),
        end: new Date("2026-04-10T10:45:00.000Z"),
        timeZone: "Europe/Berlin",
        attendees: [{ email: "sarah@example.com", displayName: "Sarah Founder" }],
      });

      expect(result.externalEventId).toBe("google_event_1");
      expect(result.eventUrl).toBe("https://calendar.google.com/event?eid=google_event_1");
    });

    it("sends the correct event body to the Google Calendar API", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ id: "google_event_2", htmlLink: null }),
      );

      await googleCalendarService.createCalendarEvent({
        calendarAccountId: "calendar_account_1",
        title: "Strategy Session",
        description: "Booking ID: booking_1",
        start: new Date("2026-04-10T10:00:00.000Z"),
        end: new Date("2026-04-10T10:45:00.000Z"),
        timeZone: "Europe/Berlin",
        attendees: [
          { email: "sarah@example.com", displayName: "Sarah Founder" },
        ],
      });

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toContain("/calendars/primary/events");
      expect(init?.method).toBe("POST");

      const body = JSON.parse(init?.body as string);
      expect(body).toMatchObject({
        summary: "Strategy Session",
        description: "Booking ID: booking_1",
        start: { dateTime: "2026-04-10T10:00:00.000Z", timeZone: "Europe/Berlin" },
        end: { dateTime: "2026-04-10T10:45:00.000Z", timeZone: "Europe/Berlin" },
        attendees: [{ email: "sarah@example.com", displayName: "Sarah Founder" }],
      });
    });

    it("extracts the Google Meet URL when the event has a hangoutLink", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({
          id: "google_event_3",
          htmlLink: "https://calendar.google.com/event?eid=google_event_3",
          hangoutLink: "https://meet.google.com/abc-defg-hij",
        }),
      );

      const result = await googleCalendarService.createCalendarEvent({
        calendarAccountId: "calendar_account_1",
        title: "Strategy Session",
        start: new Date("2026-04-10T10:00:00.000Z"),
        end: new Date("2026-04-10T10:45:00.000Z"),
        timeZone: "Europe/Berlin",
        attendees: [],
        conferenceDataVersion: 1,
      });

      expect(result.meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
    });

    it("throws when the Google API returns a non-OK response", async () => {
      vi.mocked(fetch).mockReturnValueOnce(
        makeFetchResponse({ error: { message: "Calendar not found" } }, 404),
      );

      await expect(
        googleCalendarService.createCalendarEvent({
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
});
