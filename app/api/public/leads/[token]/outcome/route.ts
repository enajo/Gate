import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { leadOutcomeSubmissionSchema } from "@/server/validators/booking.validator";

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: error.flatten() },
      { status: 422 },
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return NextResponse.json({ error: message }, { status: 400 });
}

const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW = 5 * 60 * 1000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const result = rateLimit(`outcome:submit:${ip}`, SUBMIT_LIMIT, SUBMIT_WINDOW);
  if (!result.allowed) return tooManyRequests(result.resetAt);

  try {
    const { token } = await params;
    const json = await request.json();
    const input = leadOutcomeSubmissionSchema.parse(json);

    const lead = await bookingRepository.findLeadByOutcomeToken(token);
    if (!lead) {
      return NextResponse.json(
        { error: "This link is no longer valid." },
        { status: 404 },
      );
    }

    const updated = await bookingRepository.updateLeadById(lead.id, {
      outcome: input.result,
      outcomeValue: input.result === "WON" ? (input.value ?? null) : null,
      outcomeRespondedAt: new Date(),
    });

    return NextResponse.json(
      { outcome: updated.outcome, outcomeValue: updated.outcomeValue },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
