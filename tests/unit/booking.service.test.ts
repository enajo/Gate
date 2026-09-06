import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByIdWithUser: vi.fn(),
  deductTokenBalance: vi.fn(),
}));

const mockServiceRepository = vi.hoisted(() => ({
  findByIdForProfessional: vi.fn(),
}));

const mockBookingRepository = vi.hoisted(() => ({
  findLeadByIdForProfessional: vi.fn(),
  findBookingHoldByIdForProfessional: vi.fn(),
  findActiveBookingHold: vi.fn(),
  createBookingHoldForProfessional: vi.fn(),
  updateBookingHoldById: vi.fn(),
  findBookingByHoldId: vi.fn(),
  createBookingFromHold: vi.fn(),
  createBooking: vi.fn(),
  updateBookingById: vi.fn(),
  findBookingById: vi.fn(),
  findBookingByIdWithRelations: vi.fn(),
  findBookingByIdForProfessional: vi.fn(),
  findBookingsByProfessionalId: vi.fn(),
  findUpcomingBookingsByProfessionalId: vi.fn(),
  markEventCreationPending: vi.fn(),
  markEventCreated: vi.fn(),
  markEventFailed: vi.fn(),
  cancelBooking: vi.fn(),
  releaseExpiredBookingHolds: vi.fn(),
  findBookingHoldById: vi.fn(),
  findActiveHoldsWithRelationsByProfessionalId: vi.fn(),
  findHoldWithRelationsById: vi.fn(),
  findLeadWithServiceByIdForProfessional: vi.fn(),
  updateLeadById: vi.fn(),
}));

const mockAvailabilityService = vi.hoisted(() => ({
  getBookableSlotsForService: vi.fn(),
}));

const mockAccessCodeService = vi.hoisted(() => ({
  validate: vi.fn(),
  markUsed: vi.fn(),
}));

const mockEmailService = vi.hoisted(() => ({
  sendBookingDeclinedVisitor: vi.fn(),
  sendBookingConfirmedVisitor: vi.fn(),
  sendBookingConfirmedProfessional: vi.fn(),
}));

const mockGoogleRepository = vi.hoisted(() => ({
  findDefaultEventCalendarByProfessionalId: vi.fn(),
  createCalendarEventForBooking: vi.fn(),
  touchLastSyncedAt: vi.fn(),
  findCalendarEventsByBookingId: vi.fn(),
  findCalendarAccountById: vi.fn(),
  updateCalendarEventById: vi.fn(),
}));

const mockCalendarProviderService = vi.hoisted(() => ({
  createEvent: vi.fn(),
  getMergedBusyRanges: vi.fn(),
  cancelEvent: vi.fn(),
}));

const mockPreCallBriefingService = vi.hoisted(() => ({
  generate: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

vi.mock("@/server/repositories/service.repository", () => ({
  serviceRepository: mockServiceRepository,
}));

vi.mock("@/server/repositories/booking.repository", () => ({
  bookingRepository: mockBookingRepository,
}));

vi.mock("@/server/repositories/google.repository", () => ({
  googleRepository: mockGoogleRepository,
}));

vi.mock("@/server/services/availability.service", () => ({
  availabilityService: mockAvailabilityService,
}));

vi.mock("@/server/services/access-code.service", () => ({
  accessCodeService: mockAccessCodeService,
}));

vi.mock("@/server/services/email.service", () => ({
  emailService: mockEmailService,
}));

vi.mock("@/server/services/calendar-provider.service", () => ({
  calendarProviderService: mockCalendarProviderService,
}));

vi.mock("@/server/services/pre-call-briefing.service", () => ({
  preCallBriefingService: mockPreCallBriefingService,
}));

import { bookingService } from "@/server/services/booking.service";

const PROFESSIONAL_ID = "professional_1";
const SERVICE_ID = "service_1";
const LEAD_ID = "lead_1";
const HOLD_ID = "hold_1";
const SLOT_START = new Date("2026-04-10T10:00:00.000Z");
const SLOT_END = new Date("2026-04-10T10:45:00.000Z");
const TIMEZONE = "Europe/Berlin";
const EXPIRES_AT = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now

const BASE_HOLD = {
  id: HOLD_ID,
  professionalId: PROFESSIONAL_ID,
  serviceId: SERVICE_ID,
  leadId: LEAD_ID,
  slotStart: SLOT_START,
  slotEnd: SLOT_END,
  expiresAt: EXPIRES_AT,
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BASE_BOOKING = {
  id: "booking_1",
  professionalId: PROFESSIONAL_ID,
  serviceId: SERVICE_ID,
  leadId: LEAD_ID,
  holdId: HOLD_ID,
  slotStart: SLOT_START,
  slotEnd: SLOT_END,
  timezone: TIMEZONE,
  status: "CONFIRMED",
  codeValidationStatus: "VALID",
  calendarStatus: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("bookingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockProfileRepository.findById.mockResolvedValue({
      id: PROFESSIONAL_ID,
      fullName: "John Carter",
      timezone: TIMEZONE,
    });

    mockServiceRepository.findByIdForProfessional.mockResolvedValue({
      id: SERVICE_ID,
      professionalId: PROFESSIONAL_ID,
      title: "Strategy Session",
      durationMinutes: 45,
      active: true,
    });

    mockBookingRepository.findLeadByIdForProfessional.mockResolvedValue({
      id: LEAD_ID,
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      name: "Sarah Founder",
      email: "sarah@example.com",
      qualificationResult: "QUALIFIED",
    });

    // Default: slot is available
    mockAvailabilityService.getBookableSlotsForService.mockResolvedValue({
      slots: [{ start: SLOT_START, end: SLOT_END }],
      blockedRanges: [],
    });

    // Default: no calendar events attached, so cancelBooking tests that
    // don't care about calendar sync don't need to set this up themselves.
    mockGoogleRepository.findCalendarEventsByBookingId.mockResolvedValue([]);
  });

  // ── createHold ─────────────────────────────────────────────────────────────

  describe("createHold", () => {
    it("creates a booking hold when slot is available and lead is qualified", async () => {
      mockBookingRepository.findActiveBookingHold.mockResolvedValue(null);
      mockBookingRepository.createBookingHoldForProfessional.mockResolvedValue(BASE_HOLD);

      const result = await bookingService.createHold({
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
        leadId: LEAD_ID,
        slotStart: SLOT_START.toISOString(),
        slotEnd: SLOT_END.toISOString(),
        timezone: TIMEZONE,
      });

      expect(mockBookingRepository.createBookingHoldForProfessional).toHaveBeenCalledWith(
        PROFESSIONAL_ID,
        expect.objectContaining({
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          slotStart: SLOT_START,
          slotEnd: SLOT_END,
          status: "ACTIVE",
        }),
      );
      expect(result.id).toBe(HOLD_ID);
      expect(result.status).toBe("ACTIVE");
    });

    it("returns the existing hold when the same lead already holds the slot", async () => {
      mockBookingRepository.findActiveBookingHold.mockResolvedValue(BASE_HOLD);

      const result = await bookingService.createHold({
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
        leadId: LEAD_ID,
        slotStart: SLOT_START.toISOString(),
        slotEnd: SLOT_END.toISOString(),
        timezone: TIMEZONE,
      });

      expect(mockBookingRepository.createBookingHoldForProfessional).not.toHaveBeenCalled();
      expect(result.id).toBe(HOLD_ID);
    });

    it("throws when the service is not active", async () => {
      mockServiceRepository.findByIdForProfessional.mockResolvedValue({
        id: SERVICE_ID,
        active: false,
      });

      await expect(
        bookingService.createHold({
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          slotStart: SLOT_START.toISOString(),
          slotEnd: SLOT_END.toISOString(),
          timezone: TIMEZONE,
        }),
      ).rejects.toThrow("Service is not active.");
    });

    it("throws when the selected slot is no longer available", async () => {
      mockAvailabilityService.getBookableSlotsForService.mockResolvedValue({
        slots: [],
        blockedRanges: [],
      });

      await expect(
        bookingService.createHold({
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          slotStart: SLOT_START.toISOString(),
          slotEnd: SLOT_END.toISOString(),
          timezone: TIMEZONE,
        }),
      ).rejects.toThrow("Selected slot is no longer available.");
    });

    it("throws when a different lead has an active hold on the same slot", async () => {
      mockBookingRepository.findActiveBookingHold.mockResolvedValue({
        ...BASE_HOLD,
        id: "other_hold",
        leadId: "other_lead",
      });

      await expect(
        bookingService.createHold({
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          slotStart: SLOT_START.toISOString(),
          slotEnd: SLOT_END.toISOString(),
          timezone: TIMEZONE,
        }),
      ).rejects.toThrow("This slot is temporarily reserved.");
    });

    it("throws when the lead is not qualified", async () => {
      mockBookingRepository.findLeadByIdForProfessional.mockResolvedValue({
        id: LEAD_ID,
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
        qualificationResult: "REJECTED",
      });

      await expect(
        bookingService.createHold({
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          slotStart: SLOT_START.toISOString(),
          slotEnd: SLOT_END.toISOString(),
          timezone: TIMEZONE,
        }),
      ).rejects.toThrow("Lead is not qualified for booking.");
    });
  });

  // ── confirmBooking ─────────────────────────────────────────────────────────

  describe("confirmBooking", () => {
    beforeEach(() => {
      mockBookingRepository.findBookingHoldByIdForProfessional.mockResolvedValue(BASE_HOLD);
      mockBookingRepository.findBookingByHoldId.mockResolvedValue(null);
      mockBookingRepository.createBookingFromHold.mockResolvedValue(BASE_BOOKING);
      mockBookingRepository.updateBookingHoldById.mockResolvedValue({
        ...BASE_HOLD,
        status: "CONVERTED",
      });
    });

    it("creates a booking and returns isCodeValid:true when code is valid", async () => {
      mockAccessCodeService.validate.mockResolvedValue({
        isValid: true,
        matchedCodeId: "code_1",
        codeLabel: "Founder invite",
      });

      const result = await bookingService.confirmBooking({
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
        leadId: LEAD_ID,
        holdId: HOLD_ID,
        timezone: TIMEZONE,
        accessCode: "BETA2026",
      });

      expect(mockAccessCodeService.validate).toHaveBeenCalledWith({
        professionalId: PROFESSIONAL_ID,
        code: "BETA2026",
      });
      expect(mockBookingRepository.createBookingFromHold).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalId: PROFESSIONAL_ID,
          holdId: HOLD_ID,
          status: "CONFIRMED",
          codeValidationStatus: "VALID",
        }),
      );
      expect(result.isCodeValid).toBe(true);
      expect(result.eventCreationRequired).toBe(true);
    });

    it("returns isCodeValid:false when the access code is wrong", async () => {
      mockAccessCodeService.validate.mockResolvedValue({
        isValid: false,
        matchedCodeId: null,
        codeLabel: null,
      });
      mockBookingRepository.createBooking.mockResolvedValue({
        ...BASE_BOOKING,
        status: "CODE_INVALID",
        codeValidationStatus: "INVALID",
      });

      const result = await bookingService.confirmBooking({
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
        leadId: LEAD_ID,
        holdId: HOLD_ID,
        timezone: TIMEZONE,
        accessCode: "WRONGCODE",
      });

      expect(result.isCodeValid).toBe(false);
      expect(result.eventCreationRequired).toBe(false);
      expect(mockBookingRepository.createBookingFromHold).not.toHaveBeenCalled();
    });

    it("throws when the hold is not found", async () => {
      mockBookingRepository.findBookingHoldByIdForProfessional.mockResolvedValue(null);

      await expect(
        bookingService.confirmBooking({
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          holdId: "nonexistent",
          timezone: TIMEZONE,
          accessCode: "BETA2026",
        }),
      ).rejects.toThrow("Booking hold not found.");
    });

    it("throws when the hold has expired", async () => {
      mockBookingRepository.findBookingHoldByIdForProfessional.mockResolvedValue({
        ...BASE_HOLD,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockBookingRepository.updateBookingHoldById.mockResolvedValue({
        ...BASE_HOLD,
        status: "EXPIRED",
      });

      await expect(
        bookingService.confirmBooking({
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          leadId: LEAD_ID,
          holdId: HOLD_ID,
          timezone: TIMEZONE,
          accessCode: "BETA2026",
        }),
      ).rejects.toThrow("Booking hold has expired.");
    });

    it("short-circuits when an existing valid booking exists for the hold", async () => {
      mockBookingRepository.findBookingByHoldId.mockResolvedValue({
        ...BASE_BOOKING,
        codeValidationStatus: "VALID",
        calendarStatus: "PENDING",
      });

      const result = await bookingService.confirmBooking({
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
        leadId: LEAD_ID,
        holdId: HOLD_ID,
        timezone: TIMEZONE,
        accessCode: "BETA2026",
      });

      expect(mockAccessCodeService.validate).not.toHaveBeenCalled();
      expect(result.isCodeValid).toBe(true);
    });
  });

  // ── markEventCreated / markEventFailed ─────────────────────────────────────

  describe("markEventCreated", () => {
    it("marks the calendar status as CREATED", async () => {
      mockBookingRepository.findBookingById.mockResolvedValue({ id: "booking_1" });
      mockBookingRepository.markEventCreated.mockResolvedValue({
        ...BASE_BOOKING,
        calendarStatus: "CREATED",
      });

      await bookingService.markEventCreated("booking_1");

      expect(mockBookingRepository.markEventCreated).toHaveBeenCalledWith("booking_1");
    });

    it("throws when the booking does not exist", async () => {
      mockBookingRepository.findBookingById.mockResolvedValue(null);

      await expect(
        bookingService.markEventCreated("nonexistent"),
      ).rejects.toThrow("Booking not found.");
    });
  });

  describe("markEventFailed", () => {
    it("marks the calendar status as FAILED", async () => {
      mockBookingRepository.findBookingById.mockResolvedValue({ id: "booking_1" });
      mockBookingRepository.markEventFailed.mockResolvedValue({
        ...BASE_BOOKING,
        calendarStatus: "FAILED",
      });

      await bookingService.markEventFailed("booking_1");

      expect(mockBookingRepository.markEventFailed).toHaveBeenCalledWith("booking_1");
    });

    it("throws when the booking does not exist", async () => {
      mockBookingRepository.findBookingById.mockResolvedValue(null);

      await expect(
        bookingService.markEventFailed("nonexistent"),
      ).rejects.toThrow("Booking not found.");
    });
  });

  // ── cancelBooking ──────────────────────────────────────────────────────────

  describe("cancelBooking", () => {
    const USER_ID = "user_1";
    const CALENDAR_EVENT = {
      id: "calendar_event_1",
      bookingId: "booking_1",
      calendarAccountId: "calendar_account_1",
      externalEventId: "external_event_1",
      syncStatus: "CREATED",
    };
    const CALENDAR_ACCOUNT = {
      id: "calendar_account_1",
      provider: "GOOGLE",
    };

    beforeEach(() => {
      mockProfileRepository.findByUserId.mockResolvedValue({
        id: PROFESSIONAL_ID,
      });
      mockBookingRepository.findBookingByIdForProfessional.mockResolvedValue(
        BASE_BOOKING,
      );
      mockBookingRepository.cancelBooking.mockResolvedValue({
        ...BASE_BOOKING,
        status: "CANCELLED",
      });
    });

    it("cancels the calendar event when one is attached to the booking", async () => {
      mockGoogleRepository.findCalendarEventsByBookingId.mockResolvedValue([
        CALENDAR_EVENT,
      ]);
      mockGoogleRepository.findCalendarAccountById.mockResolvedValue(
        CALENDAR_ACCOUNT,
      );

      await bookingService.cancelBooking(USER_ID, "booking_1");

      expect(mockCalendarProviderService.cancelEvent).toHaveBeenCalledWith(
        CALENDAR_ACCOUNT,
        {
          calendarAccountId: CALENDAR_EVENT.calendarAccountId,
          externalEventId: CALENDAR_EVENT.externalEventId,
        },
      );
      expect(mockGoogleRepository.updateCalendarEventById).toHaveBeenCalledWith(
        CALENDAR_EVENT.id,
        { syncStatus: "CANCELLED" },
      );
    });

    it("still cancels the booking even if the calendar provider throws", async () => {
      mockGoogleRepository.findCalendarEventsByBookingId.mockResolvedValue([
        CALENDAR_EVENT,
      ]);
      mockGoogleRepository.findCalendarAccountById.mockResolvedValue(
        CALENDAR_ACCOUNT,
      );
      mockCalendarProviderService.cancelEvent.mockRejectedValue(
        new Error("Google API is down"),
      );

      const result = await bookingService.cancelBooking(USER_ID, "booking_1");

      expect(result.status).toBe("CANCELLED");
      expect(mockGoogleRepository.updateCalendarEventById).not.toHaveBeenCalled();
    });

    it("skips calendar events that are already cancelled", async () => {
      mockGoogleRepository.findCalendarEventsByBookingId.mockResolvedValue([
        { ...CALENDAR_EVENT, syncStatus: "CANCELLED" },
      ]);

      await bookingService.cancelBooking(USER_ID, "booking_1");

      expect(mockCalendarProviderService.cancelEvent).not.toHaveBeenCalled();
    });

    it("throws when the booking does not exist", async () => {
      mockBookingRepository.findBookingByIdForProfessional.mockResolvedValue(
        null,
      );

      await expect(
        bookingService.cancelBooking(USER_ID, "nonexistent"),
      ).rejects.toThrow("Booking not found.");
    });
  });

  // ── getPreCallBriefing ─────────────────────────────────────────────────────

  describe("getPreCallBriefing", () => {
    const USER_ID = "user_1";
    const LEAD_WITH_SERVICE = {
      id: LEAD_ID,
      professionalId: PROFESSIONAL_ID,
      name: "Jordan Rivera",
      answersJson: { conversationHistory: [{ role: "user", content: "I need help." }] },
      service: { id: SERVICE_ID, title: "Strategy Session" },
      briefingSummary: null,
      briefingGeneratedAt: null,
    };

    beforeEach(() => {
      mockProfileRepository.findByUserId.mockResolvedValue({ id: PROFESSIONAL_ID });
    });

    it("returns the cached briefing without calling the AI service", async () => {
      const generatedAt = new Date("2026-01-01T00:00:00.000Z");
      mockBookingRepository.findLeadWithServiceByIdForProfessional.mockResolvedValue({
        ...LEAD_WITH_SERVICE,
        briefingSummary: { summary: "Cached", keyPoints: [], suggestedOpening: "" },
        briefingGeneratedAt: generatedAt,
      });

      const result = await bookingService.getPreCallBriefing(USER_ID, LEAD_ID);

      expect(mockPreCallBriefingService.generate).not.toHaveBeenCalled();
      expect(result.summary).toBe("Cached");
      expect(result.generatedAt).toBe(generatedAt);
    });

    it("generates, persists, and deducts tokens on first call", async () => {
      mockBookingRepository.findLeadWithServiceByIdForProfessional.mockResolvedValue(
        LEAD_WITH_SERVICE,
      );
      mockPreCallBriefingService.generate.mockResolvedValue({
        summary: "Fresh summary",
        keyPoints: ["Point one"],
        suggestedOpening: "Hi Jordan",
        tokensUsed: 250,
      });
      mockBookingRepository.updateLeadById.mockResolvedValue({});

      const result = await bookingService.getPreCallBriefing(USER_ID, LEAD_ID);

      expect(mockPreCallBriefingService.generate).toHaveBeenCalledWith({
        clientName: "Jordan Rivera",
        serviceName: "Strategy Session",
        conversationHistory: LEAD_WITH_SERVICE.answersJson.conversationHistory,
      });
      expect(mockProfileRepository.deductTokenBalance).toHaveBeenCalledWith(
        PROFESSIONAL_ID,
        250,
      );
      expect(mockBookingRepository.updateLeadById).toHaveBeenCalledWith(
        LEAD_ID,
        expect.objectContaining({
          briefingSummary: {
            summary: "Fresh summary",
            keyPoints: ["Point one"],
            suggestedOpening: "Hi Jordan",
          },
        }),
      );
      expect(result.summary).toBe("Fresh summary");
    });

    it("does not deduct tokens when the AI call used zero tokens (fail-open)", async () => {
      mockBookingRepository.findLeadWithServiceByIdForProfessional.mockResolvedValue({
        ...LEAD_WITH_SERVICE,
        answersJson: { autoQualified: true, history: [] },
      });
      mockPreCallBriefingService.generate.mockResolvedValue({
        summary: "",
        keyPoints: [],
        suggestedOpening: "",
        tokensUsed: 0,
      });
      mockBookingRepository.updateLeadById.mockResolvedValue({});

      const result = await bookingService.getPreCallBriefing(USER_ID, LEAD_ID);

      expect(mockProfileRepository.deductTokenBalance).not.toHaveBeenCalled();
      expect(result.summary).toBe("");
    });

    it("throws when the lead does not exist for this professional", async () => {
      mockBookingRepository.findLeadWithServiceByIdForProfessional.mockResolvedValue(null);

      await expect(
        bookingService.getPreCallBriefing(USER_ID, "nonexistent"),
      ).rejects.toThrow("Lead not found.");
    });
  });
});
