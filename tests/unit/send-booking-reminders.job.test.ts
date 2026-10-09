import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBookingRepository = vi.hoisted(() => ({
  findBookingsNeedingReminder: vi.fn(),
  updateBookingById: vi.fn(),
}));

const mockEmailService = vi.hoisted(() => ({
  sendBookingReminderVisitor: vi.fn(),
}));

vi.mock("@/server/repositories/booking.repository", () => ({
  bookingRepository: mockBookingRepository,
}));

vi.mock("@/server/services/email.service", () => ({
  emailService: mockEmailService,
}));

import { sendBookingRemindersJob } from "@/server/jobs/send-booking-reminders.job";

const BOOKING = {
  id: "booking_1",
  leadId: "lead_1",
  holdId: "hold_1",
  slotStart: new Date("2026-10-04T14:00:00Z"),
  slotEnd: new Date("2026-10-04T14:30:00Z"),
  timezone: "Europe/Berlin",
  lead: { name: "Jordan Rivera", email: "jordan@example.com" },
  service: { title: "Strategy Session" },
  professional: { fullName: "Dana Expert" },
};

describe("sendBookingRemindersJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookingRepository.updateBookingById.mockResolvedValue({});
    mockEmailService.sendBookingReminderVisitor.mockResolvedValue(undefined);
  });

  it("sends a reminder for each booking in the window and marks it sent first", async () => {
    mockBookingRepository.findBookingsNeedingReminder.mockResolvedValue([BOOKING]);

    const result = await sendBookingRemindersJob();

    expect(mockBookingRepository.updateBookingById).toHaveBeenCalledWith(
      "booking_1",
      { reminderSentAt: expect.any(Date) },
    );
    expect(mockEmailService.sendBookingReminderVisitor).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jordan@example.com",
        visitorName: "Jordan Rivera",
        professionalName: "Dana Expert",
        serviceTitle: "Strategy Session",
        holdId: "hold_1",
      }),
    );
    expect(result.totals).toEqual({ scanned: 1, sent: 1, failed: 0 });
  });

  it("marks the booking sent even if the email send itself fails, so a flaky send doesn't retry forever", async () => {
    mockBookingRepository.findBookingsNeedingReminder.mockResolvedValue([BOOKING]);
    mockEmailService.sendBookingReminderVisitor.mockRejectedValue(
      new Error("Resend unavailable"),
    );

    const result = await sendBookingRemindersJob();

    expect(mockBookingRepository.updateBookingById).toHaveBeenCalledWith(
      "booking_1",
      { reminderSentAt: expect.any(Date) },
    );
    expect(result.totals).toEqual({ scanned: 1, sent: 0, failed: 1 });
  });

  it("does nothing when no bookings are in the reminder window", async () => {
    mockBookingRepository.findBookingsNeedingReminder.mockResolvedValue([]);

    const result = await sendBookingRemindersJob();

    expect(mockEmailService.sendBookingReminderVisitor).not.toHaveBeenCalled();
    expect(result.totals).toEqual({ scanned: 0, sent: 0, failed: 0 });
  });
});
