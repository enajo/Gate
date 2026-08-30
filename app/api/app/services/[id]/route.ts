import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { serviceCatalogService } from "@/server/services/service-catalog.service";
import {
  serviceIdParamSchema,
  updateServiceSchema,
} from "@/server/validators/service.validator";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid service request",
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

  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (
    message === "Professional profile not found." ||
    message === "Service not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (message === "This service slug is already in use.") {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (message.startsWith("Your plan allows")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getServiceIdFromContext(context: RouteContext) {
  const rawParams = await context.params;
  const params = serviceIdParamSchema.parse(rawParams);
  return params.id;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const serviceId = await getServiceIdFromContext(context);
    const service = await serviceCatalogService.getServiceById(userId, serviceId);

    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        service,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const serviceId = await getServiceIdFromContext(context);
    const json = await request.json();
    const input = updateServiceSchema.parse(json);

    const service = await serviceCatalogService.updateService(
      userId,
      serviceId,
      input,
    );

    return NextResponse.json(
      {
        service,
        message: "Service updated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const serviceId = await getServiceIdFromContext(context);

    await serviceCatalogService.deleteService(userId, serviceId);

    return NextResponse.json(
      {
        message: "Service deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}