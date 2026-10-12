import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { aiConversationService } from "@/server/services/ai-conversation.service";
import { gateTestService } from "@/server/services/gate-test.service";
import { gateTestRequestSchema } from "@/server/validators/service.validator";

// One simulated visitor is ~8–12 sequential OpenAI calls.
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

// Not metered against tokenBalance — testing must never eat a FREE expert's
// live screening allowance. A run is ~6 visitors on gpt-4o-mini (about a
// cent), so this per-professional cap bounds cost instead: ~5 runs/hour.
const TEST_LIMIT = 30;
const TEST_WINDOW = 60 * 60 * 1000;

/**
 * Runs ONE simulated visitor against the expert's draft gate prompt. The
 * client fires a batch of these in parallel so results appear one by one.
 * Nothing is persisted — simulated visitors never become Leads, so they
 * can't touch the inbox, attribution, reports, or billing.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: serviceId } = await context.params;

    const professional = await profileRepository.findByUserId(session.user.id);
    if (!professional) {
      return NextResponse.json({ error: "Professional profile not found." }, { status: 404 });
    }

    const limit = await rateLimit(`gate-test:${professional.id}`, TEST_LIMIT, TEST_WINDOW);
    if (!limit.allowed) return tooManyRequests(limit.resetAt);

    const input = gateTestRequestSchema.parse(await request.json());

    if (!gateTestService.isAvailable()) {
      return NextResponse.json(
        { error: "Gate testing is not available. Check your OpenAI API key." },
        { status: 503 },
      );
    }

    // A control-room draft service may not be saved yet — that's fine, the
    // draft is tested on its own. Calibration examples are only loaded once
    // the service is confirmed to be this professional's: the labeled-leads
    // query isn't professional-scoped, so an unchecked id could pull another
    // expert's visitors into this prompt.
    const [savedService, activeServices] = await Promise.all([
      serviceRepository.findByIdForProfessional(serviceId, professional.id),
      serviceRepository.findActiveByProfessionalId(professional.id),
    ]);

    const labeledExamples = savedService
      ? aiConversationService.buildLabeledExamples(
          await bookingRepository.findRecentLabeledLeadsForService(savedService.id),
        )
      : [];

    const services = gateTestService.withDraftGate(
      activeServices.map((s) => ({
        id: s.id,
        title: s.title,
        displayPrice: s.displayPrice,
        description: s.description,
        idealPersonaDescription: s.idealPersonaDescription,
        directPurchaseUrl: s.directPurchaseUrl,
      })),
      {
        serviceId,
        title: savedService?.title ?? input.serviceTitle,
        idealPersonaDescription: input.idealPersonaDescription,
      },
    );

    const result = await gateTestService.runSimulatedVisitor({
      professionalName: professional.fullName,
      professionalTitle: professional.title,
      professionalBio: professional.bio,
      services,
      targetServiceId: serviceId,
      labeledExamples,
      archetype: input.archetype,
      variant: input.variant,
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.flatten() },
        { status: 422 },
      );
    }

    logger.error("gate/test: simulated visitor failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Couldn't run this test visitor. Please try again." },
      { status: 502 },
    );
  }
}
