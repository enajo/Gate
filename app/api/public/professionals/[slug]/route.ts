import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { profileService } from "@/server/services/profile.service";

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

const publicProfessionalSlugParamSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required."),
});

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid professional slug",
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

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getSlugFromContext(context: RouteContext) {
  const rawParams = await context.params;
  const params = publicProfessionalSlugParamSchema.parse(rawParams);
  return params.slug;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const slug = await getSlugFromContext(context);
    const professional = await profileService.getPublicProfileBySlug(slug);

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        professional,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}