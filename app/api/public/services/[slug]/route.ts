import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { serviceCatalogService } from "@/server/services/service-catalog.service";

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

const publicServicesSlugParamSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required."),
});

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid services slug",
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
  const params = publicServicesSlugParamSchema.parse(rawParams);
  return params.slug;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const slug = await getSlugFromContext(context);
    const services = await serviceCatalogService.listActivePublicServices(slug);

    return NextResponse.json(
      {
        services,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}