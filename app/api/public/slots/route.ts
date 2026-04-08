import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { availabilityService } from "@/server/services/availability.service";
import { serviceAvailabilityRequestSchema } from "@/server/validators/service.validator";

const publicSlotsQuerySchema = serviceAvailabilityRequestSchema.extend({
  slug: z.string().trim().min(1, "Slug is required."),
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = publicSlotsQuerySchema.parse({
      slug: searchParams.get("slug") ?? undefined,
      serviceId: searchParams.get("serviceId") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      timezone: searchParams.get("timezone") ?? undefined,
    });

    const result = await availabilityService.getPublicBookableSlots({
      slug: query.slug,
      serviceId: query.serviceId,
      startDate: query.startDate,
      endDate: query.endDate,
      timezone: query.timezone,
    });

    return NextResponse.json(
      {
        slots: result.slots,
        blockedRanges: result.blockedRanges,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}