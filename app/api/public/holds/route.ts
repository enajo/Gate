import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { emailService } from "@/server/services/email.service";
import { accessCodeService } from "@/server/services/access-code.service";
import { bookingService } from "@/server/services/booking.service";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { bookingSlotSelectionSchema } from "@/server/validators/booking.validator";

const publicCreateHoldSchema = bookingSlotSelectionSchema.extend({
  professionalId: z.string().trim().min(1),
  leadId: z.string().trim().min(1),
  accessCodeId: z.string().trim().min(1).optional().nullable(),
});

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid booking hold request",
      details: error.flatten(),
    },
    { status: 422 },
  );
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (
    message === "Professional profile not found." ||
    message === "Service not found." ||
    message === "Lead not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (
    message === "Lead is not qualified for booking." ||
    message === "Service is not active." ||
    message === "Selected slot is no longer available."
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (message === "This slot is temporarily reserved.") {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const input = publicCreateHoldSchema.parse({
      professionalId: json.professionalId,
      serviceId: json.serviceId,
      leadId: json.leadId,
      slotStart: json.slotStart,
      slotEnd: json.slotEnd,
      timezone: json.timezone ?? DEFAULT_TIMEZONE,
      accessCodeId: json.accessCodeId ?? null,
    });

    // 1. Create the hold (validates slot, lead, service etc.)
    const hold = await bookingService.createHold({
      professionalId: input.professionalId,
      serviceId: input.serviceId,
      leadId: input.leadId,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      timezone: input.timezone,
    });

    // 1b. Mark access code as used (fire-and-forget; non-fatal)
    if (input.accessCodeId) {
      const leadEmail = hold.leadId
        ? await bookingRepository.findLeadById(hold.leadId).then((l) => l?.email ?? "unknown")
        : "unknown";
      void accessCodeService.markUsed(input.accessCodeId, leadEmail);
    }

    // 2. Fetch supporting data for auto-confirm decision + emails
    const [service, lead, professional] = await Promise.all([
      serviceRepository.findById(input.serviceId),
      hold.leadId ? bookingRepository.findLeadById(hold.leadId) : null,
      profileRepository.findByIdWithUser(input.professionalId),
    ]);

    const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

    // 3a. Auto-confirm when manual approval is NOT required
    if (!service?.manualApprovalRequired) {
      const booking = await bookingService.autoConfirmFromHold({
        holdId: hold.id,
        professionalId: hold.professionalId,
        timezone: input.timezone,
      });

      // Fire calendar event + confirmation emails without blocking
      void bookingService.postConfirmAsync({
        bookingId: booking.id,
        professionalId: hold.professionalId,
        timezone: input.timezone,
      });

      return NextResponse.json(
        {
          hold,
          holdId: hold.id,
          expiresAt: hold.expiresAt,
          autoConfirmed: true,
          bookingId: booking.id,
        },
        { status: 201 },
      );
    }

    // 3b. Manual approval required — notify both parties and keep hold active
    if (lead && professional) {
      const professionalEmail = professional.user.email;

      void Promise.allSettled([
        // Tell visitor their slot is held pending review
        emailService.sendHoldCreatedVisitor({
          to: lead.email,
          visitorName: lead.name,
          professionalName: professional.fullName,
          serviceTitle: service.title,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          timezone: input.timezone,
          holdId: hold.id,
          expiresAt: hold.expiresAt,
          requiresApproval: true,
          appUrl,
        }),
        // Tell professional there is a new request waiting
        emailService.sendNewBookingRequestProfessional({
          to: professionalEmail,
          professionalName: professional.fullName,
          visitorName: lead.name,
          visitorEmail: lead.email,
          serviceTitle: service.title,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          timezone: input.timezone,
          holdId: hold.id,
          appUrl,
        }),
      ]).catch((err: unknown) => logger.error("Hold notification emails failed", { err }));
    }

    return NextResponse.json(
      {
        hold,
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        autoConfirmed: false,
        bookingId: null,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
