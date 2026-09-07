import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { visitRepository } from "@/server/repositories/visit.repository";

const VISITOR_COOKIE = "gate_visitor_id";

/** Best-effort — a visitor without the cookie (blocked cookies, first-party mismatch) just doesn't get stitched. */
async function linkVisitsIfPossible(professionalId: string, leadId: string) {
  try {
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
    if (!visitorId) return;

    await visitRepository.linkVisitsToLead({ professionalId, visitorId, leadId });
  } catch (error) {
    logger.error("qualification/submit: failed to link visits to lead", {
      error: error instanceof Error ? error.message : String(error),
      professionalId,
      leadId,
    });
  }
}

// ── Input schema ──────────────────────────────────────────────────────────────

const submitSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(320),
    referrer: z.string().trim().max(500).nullish(),
    utmSource: z.string().trim().max(200).nullish(),
    utmMedium: z.string().trim().max(200).nullish(),
    utmCampaign: z.string().trim().max(200).nullish(),
  })
  .strict();

// ── Error helper ──────────────────────────────────────────────────────────────

function errorResponse(error: unknown, status = 400) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 422 },
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (
    message === "Professional profile not found." ||
    message === "Service not found." ||
    message === "This service requires qualification."
  ) {
    return NextResponse.json({ error: message }, { status });
  }

  logger.error("Unexpected error in POST /api/public/qualification/submit", {
    error: message,
  });

  return NextResponse.json({ error: message }, { status: 500 });
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * Creates a Lead directly, with no AI conversation — the Open-mode path.
 * handleBookSlot() calls this when a visitor never went through the gate
 * chat (there's nothing to go through: the service isn't screening).
 *
 * Guarded server-side to only ever run for OPEN services. A Triage or
 * Gatekeeper service's visitors must go through /qualification/chat —
 * this endpoint existing at all must never become a way to skip that and
 * instantly mint a QUALIFIED lead on a service that's supposed to screen.
 */
const SUBMIT_LIMIT = 20;
const SUBMIT_WINDOW = 5 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const result = rateLimit(`qualification:submit:${ip}`, SUBMIT_LIMIT, SUBMIT_WINDOW);
  if (!result.allowed) return tooManyRequests(result.resetAt);

  try {
    const json = (await request.json()) as Record<string, unknown>;
    const input = submitSchema.parse(json);

    const professional = await profileRepository.findById(input.professionalId);
    if (!professional) {
      return NextResponse.json(
        { error: "Professional profile not found." },
        { status: 404 },
      );
    }

    const service = await serviceRepository.findByIdForProfessional(
      input.serviceId,
      input.professionalId,
    );
    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    if (service.qualificationMode !== "OPEN") {
      return NextResponse.json(
        { error: "This service requires qualification." },
        { status: 400 },
      );
    }

    const lead = await bookingRepository.createLeadForProfessional(
      input.professionalId,
      {
        serviceId: input.serviceId,
        name: input.name,
        email: input.email,
        answersJson: {
          mode: "OPEN",
          skippedQualification: true,
        } as Prisma.InputJsonValue,
        qualificationResult: "QUALIFIED",
        referrer: input.referrer ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
      },
    );

    await linkVisitsIfPossible(input.professionalId, lead.id);

    return NextResponse.json({ lead: { id: lead.id } });
  } catch (error) {
    return errorResponse(error);
  }
}
