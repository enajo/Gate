import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { outlookAuthService } from "@/server/services/outlook-auth.service";
import { outlookSyncService } from "@/server/services/outlook-sync.service";
import { outlookCallbackPayloadSchema } from "@/server/validators/outlook.validator";

function buildRedirectUrl(
  request: Request,
  options?: {
    returnTo?: string | null;
    status?: "success" | "error";
    message?: string;
    providerEmail?: string;
    defaultCalendarId?: string | null;
  },
) {
  const url = new URL(
    options?.returnTo || "/app/calendars",
    request.url,
  );

  if (options?.status) {
    url.searchParams.set("outlook", options.status);
  }

  if (options?.message) {
    url.searchParams.set("message", options.message);
  }

  if (options?.providerEmail) {
    url.searchParams.set("providerEmail", options.providerEmail);
  }

  if (options?.defaultCalendarId) {
    url.searchParams.set("defaultCalendarId", options.defaultCalendarId);
  }

  return url;
}

function safeDecodeReturnTo(state?: string | null) {
  try {
    const decoded = outlookAuthService.decodeState(state);
    return decoded?.returnTo ?? "/app/calendars";
  } catch {
    return "/app/calendars";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const returnTo = safeDecodeReturnTo(state);

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.redirect(
        buildRedirectUrl(request, {
          returnTo: "/login",
          status: "error",
          message: "You must be logged in to connect Outlook Calendar.",
        }),
      );
    }

    const oauthError = url.searchParams.get("error");
    const oauthErrorDescription = url.searchParams.get("error_description");

    if (oauthError) {
      return NextResponse.redirect(
        buildRedirectUrl(request, {
          returnTo,
          status: "error",
          message: oauthErrorDescription || oauthError,
        }),
      );
    }

    const payload = outlookCallbackPayloadSchema.parse({
      code: url.searchParams.get("code"),
      state,
    });

    const result = await outlookSyncService.connectOutlookAccountFromCallback(
      userId,
      payload,
    );

    return NextResponse.redirect(
      buildRedirectUrl(request, {
        returnTo,
        status: "success",
        message: "Outlook Calendar connected successfully.",
        providerEmail: result.providerEmail,
        defaultCalendarId: result.defaultCalendarId ?? null,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect Outlook Calendar.";

    return NextResponse.redirect(
      buildRedirectUrl(request, {
        returnTo,
        status: "error",
        message,
      }),
    );
  }
}
