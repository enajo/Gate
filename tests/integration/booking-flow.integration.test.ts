import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQualificationService = vi.hoisted(() => ({
  submitQualification: vi.fn(),
}));

const mockAvailabilityService = vi.hoisted(() => ({
  getPublicSlots: vi.fn(),
}));

const mockBookingService = vi.hoisted(() => ({
  createHold: vi.fn(),
  confirmBooking: vi.fn(),
}));

vi.mock("@/server/services/qualification.service", () => ({
  qualificationService: mockQualificationService,
}));

vi.mock("@/server/services/availability.service", () => ({
  availabilityService: mockAvailabilityService,
}));

vi.mock("@/server/services/booking.service", () => ({
  bookingService: mockBookingService,
}));

describe("booking flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the happy-path public booking flow from qualification to confirmed booking", async () => {
    mockQualificationService.submitQualification.mockResolvedValue({
      lead: {
        id: "lead_1",
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Sarah Founder",
        email: "sarah@example.com",
        qualificationResult: "QUALIFIED",
      },
      evaluation: {
        result: "QUALIFIED",
        outcomeType: "ALLOW_BOOKING",
        outcomeValue: "Proceed to booking.",
        matchedRuleId: "rule_allow",
      },
    });

    mockAvailabilityService.getPublicSlots.mockResolvedValue({
      slots: [
        {
          start: "2026-04-10T10:00:00.000Z",
          end: "2026-04-10T10:45:00.000Z",
        },
        {
          start: "2026-04-10T14:00:00.000Z",
          end: "2026-04-10T14:45:00.000Z",
        },
      ],
      blockedRanges: [],
    });

    mockBookingService.createHold.mockResolvedValue({
      holdId: "hold_1",
      expiresAt: "2026-04-10T09:55:00.000Z",
      hold: {
        id: "hold_1",
        slotStart: "2026-04-10T10:00:00.000Z",
        slotEnd: "2026-04-10T10:45:00.000Z",
        expiresAt: "2026-04-10T09:55:00.000Z",
      },
    });

    mockBookingService.confirmBooking.mockResolvedValue({
      booking: {
        id: "booking_1",
        status: "EVENT_CREATION_PENDING",
        slotStart: "2026-04-10T10:00:00.000Z",
        slotEnd: "2026-04-10T10:45:00.000Z",
        timezone: "Europe/Berlin",
      },
      isCodeValid: true,
      eventCreationRequired: true,
      success: {
        bookingId: "booking_1",
        professionalName: "John Carter",
        serviceTitle: "Strategy Session",
        slotStart: "2026-04-10T10:00:00.000Z",
        slotEnd: "2026-04-10T10:45:00.000Z",
        timezone: "Europe/Berlin",
        meetingUrl: null,
        eventUrl: null,
      },
      message: "Booking created. Calendar event creation is pending.",
    });

    const qualificationResult =
      await mockQualificationService.submitQualification({
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Sarah Founder",
        email: "sarah@example.com",
        answers: {
          revenue: 12000,
          urgency: "This month",
        },
      });

    expect(qualificationResult.evaluation).toMatchObject({
      result: "QUALIFIED",
      outcomeType: "ALLOW_BOOKING",
    });

    const slotsResult = await mockAvailabilityService.getPublicSlots({
      slug: "john-carter",
      serviceId: "service_1",
      startDate: "2026-04-10T00:00:00.000Z",
      endDate: "2026-04-17T00:00:00.000Z",
      timezone: "Europe/Berlin",
    });

    expect(slotsResult.slots).toHaveLength(2);

    const selectedSlot = slotsResult.slots[0];

    const holdResult = await mockBookingService.createHold({
      professionalId: "professional_1",
      serviceId: "service_1",
      leadId: qualificationResult.lead.id,
      slotStart: selectedSlot.start,
      slotEnd: selectedSlot.end,
      timezone: "Europe/Berlin",
    });

    expect(holdResult).toMatchObject({
      holdId: "hold_1",
    });

    const bookingResult = await mockBookingService.confirmBooking({
      professionalId: "professional_1",
      serviceId: "service_1",
      leadId: qualificationResult.lead.id,
      holdId: holdResult.holdId,
      timezone: "Europe/Berlin",
      accessCode: "BETA2026",
    });

    expect(mockQualificationService.submitQualification).toHaveBeenCalledOnce();
    expect(mockAvailabilityService.getPublicSlots).toHaveBeenCalledOnce();
    expect(mockBookingService.createHold).toHaveBeenCalledWith({
      professionalId: "professional_1",
      serviceId: "service_1",
      leadId: "lead_1",
      slotStart: "2026-04-10T10:00:00.000Z",
      slotEnd: "2026-04-10T10:45:00.000Z",
      timezone: "Europe/Berlin",
    });
    expect(mockBookingService.confirmBooking).toHaveBeenCalledWith({
      professionalId: "professional_1",
      serviceId: "service_1",
      leadId: "lead_1",
      holdId: "hold_1",
      timezone: "Europe/Berlin",
      accessCode: "BETA2026",
    });

    expect(bookingResult).toMatchObject({
      isCodeValid: true,
      eventCreationRequired: true,
      success: {
        bookingId: "booking_1",
        serviceTitle: "Strategy Session",
      },
    });
  });

  it("stops the flow when qualification rejects the lead", async () => {
    mockQualificationService.submitQualification.mockResolvedValue({
      lead: {
        id: "lead_2",
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Too Early Founder",
        email: "early@example.com",
        qualificationResult: "REJECTED",
      },
      evaluation: {
        result: "REJECTED",
        outcomeType: "REJECT",
        outcomeValue: "This request is not a fit right now.",
        matchedRuleId: "rule_reject",
      },
    });

    const qualificationResult =
      await mockQualificationService.submitQualification({
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Too Early Founder",
        email: "early@example.com",
        answers: {
          revenue: 500,
          urgency: "Just exploring",
        },
      });

    expect(qualificationResult.evaluation).toMatchObject({
      result: "REJECTED",
      outcomeType: "REJECT",
    });

    expect(mockAvailabilityService.getPublicSlots).not.toHaveBeenCalled();
    expect(mockBookingService.createHold).not.toHaveBeenCalled();
    expect(mockBookingService.confirmBooking).not.toHaveBeenCalled();
  });

  it("fails confirmation when the access code is invalid after a valid hold", async () => {
    mockQualificationService.submitQualification.mockResolvedValue({
      lead: {
        id: "lead_3",
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Valid Lead",
        email: "valid@example.com",
        qualificationResult: "QUALIFIED",
      },
      evaluation: {
        result: "QUALIFIED",
        outcomeType: "ALLOW_BOOKING",
        outcomeValue: "Proceed to booking.",
        matchedRuleId: "rule_allow",
      },
    });

    mockAvailabilityService.getPublicSlots.mockResolvedValue({
      slots: [
        {
          start: "2026-04-11T09:00:00.000Z",
          end: "2026-04-11T09:45:00.000Z",
        },
      ],
      blockedRanges: [],
    });

    mockBookingService.createHold.mockResolvedValue({
      holdId: "hold_2",
      expiresAt: "2026-04-11T08:55:00.000Z",
      hold: {
        id: "hold_2",
        slotStart: "2026-04-11T09:00:00.000Z",
        slotEnd: "2026-04-11T09:45:00.000Z",
        expiresAt: "2026-04-11T08:55:00.000Z",
      },
    });

    mockBookingService.confirmBooking.mockRejectedValue(
      new Error("Invalid access code."),
    );

    const qualificationResult =
      await mockQualificationService.submitQualification({
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Valid Lead",
        email: "valid@example.com",
        answers: {
          revenue: 9000,
        },
      });

    const slotsResult = await mockAvailabilityService.getPublicSlots({
      slug: "john-carter",
      serviceId: "service_1",
      startDate: "2026-04-11T00:00:00.000Z",
      endDate: "2026-04-18T00:00:00.000Z",
      timezone: "Europe/Berlin",
    });

    const holdResult = await mockBookingService.createHold({
      professionalId: "professional_1",
      serviceId: "service_1",
      leadId: qualificationResult.lead.id,
      slotStart: slotsResult.slots[0].start,
      slotEnd: slotsResult.slots[0].end,
      timezone: "Europe/Berlin",
    });

    await expect(
      mockBookingService.confirmBooking({
        professionalId: "professional_1",
        serviceId: "service_1",
        leadId: qualificationResult.lead.id,
        holdId: holdResult.holdId,
        timezone: "Europe/Berlin",
        accessCode: "WRONGCODE",
      }),
    ).rejects.toThrow("Invalid access code.");

    expect(mockBookingService.createHold).toHaveBeenCalledOnce();
    expect(mockBookingService.confirmBooking).toHaveBeenCalledOnce();
  });
});