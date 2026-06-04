import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { accessCodeService } from "@/server/services/access-code.service";

const schema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1).nullable().optional(),
    code: z.string().trim().min(1).max(100),
  })
  .strict();

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 422 },
    );
  }

  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = schema.parse(json);

    const result = await accessCodeService.validate({
      professionalId: input.professionalId,
      serviceId: input.serviceId ?? null,
      code: input.code,
    });

    // Always return 200 — callers check the `isValid` field.
    // Never expose which codes exist via 404/403.
    return NextResponse.json(
      {
        isValid: result.isValid,
        accessCodeId: result.isValid ? (result.matchedCodeId ?? null) : null,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
