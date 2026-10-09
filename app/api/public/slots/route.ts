import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { availabilityService } from "@/server/services/availability.service";
import { transformSlots } from "@/server/services/public-sales-page.service";
import { profileRepository } from "@/server/repositories/profile.repository";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { serviceAvailabilityRequestSchema } from "@/server/validators/service.validator";

const publicSlotsQuerySchema = serviceAvailabilityRequestSchema.extend({
  slug: z.string().trim().min(1, "Slug is required."),
  /**
   * Only ever used to RE-DERIVE strong-fit status server-side (see
   * resolvePriorityAccess below) — never trusted directly for anything.
   */
  leadId: z.string().trim().min(1).optional(),
});

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid slots request",
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
    message === "Service not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Re-derives whether this request should see priority slots. Fail-safe on
 * every branch — a missing lead, a lead belonging to a different
 * professional/service, or a lead that just isn't strong-fit all fall back
 * to standard access silently. Never throws, never blocks the booking flow.
 */
async function resolvePriorityAccess(
  leadId: string | undefined,
  professionalId: string,
  serviceId: string,
): Promise<boolean> {
  if (!leadId) return false;

  try {
    const lead = await bookingRepository.findLeadByIdForProfessional(
      leadId,
      professionalId,
    );

    if (!lead || lead.serviceId !== serviceId) return false;

    return lead.isStrongFit === true;
  } catch (error) {
    // A transient lookup failure must never break the whole slots request —
    // not even for a legitimately strong-fit lead. Fall back to standard
    // access, same fail-open posture as the rest of this service.
    logger.error("/api/public/slots: priority-access lookup failed", {
      leadId,
      professionalId,
      serviceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = publicSlotsQuerySchema.parse({
      slug: searchParams.get("slug") ?? undefined,
      serviceId: searchParams.get("serviceId") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      timezone: searchParams.get("timezone") ?? undefined,
      leadId: searchParams.get("leadId") ?? undefined,
    });

    const professional = await profileRepository.findBySlug(query.slug);

    if (!professional) {
      return NextResponse.json(
        { error: "Professional profile not found." },
        { status: 404 },
      );
    }

    const hasPriorityAccess = await resolvePriorityAccess(
      query.leadId,
      professional.id,
      query.serviceId,
    );

    const result = await availabilityService.getPublicBookableSlots({
      slug: query.slug,
      serviceId: query.serviceId,
      startDate: query.startDate,
      endDate: query.endDate,
      timezone: query.timezone,
      includePriorityRules: hasPriorityAccess,
    });

    const timezone =
      query.timezone ?? professional.timezone ?? "UTC";
    const { availableDates, slotsPerDate } = transformSlots(
      result.slots,
      timezone,
    );

    return NextResponse.json(
      {
        availableDates,
        slotsPerDate,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
