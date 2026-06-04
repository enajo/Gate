import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { profileService } from "@/server/services/profile.service";

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

const slugParamSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required."),
});

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid slug", details: error.flatten() },
      { status: 422 },
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getSlug(context: RouteContext): Promise<string> {
  const rawParams = await context.params;
  const { slug } = slugParamSchema.parse(rawParams);
  return slug;
}

// GET /api/public/professionals/[slug]
// Returns the public profile for a published professional.
// Still used by usePublicProfile hook — returns the full PublicProfessionalProfile shape.

export async function GET(_request: Request, context: RouteContext) {
  try {
    const slug = await getSlug(context);
    const professional = await profileService.getPublicProfileBySlug(slug);

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ professional }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
