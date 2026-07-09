import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByIdWithUser: vi.fn(),
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
}));

const mockGoogleCalendarService = vi.hoisted(() => ({
  createCalendarEvent: vi.fn(),
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

vi.mock("@/server/services/google-calendar.service", () => ({
  googleCalendarService: mockGoogleCalendarService,
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
});
