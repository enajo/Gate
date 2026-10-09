import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  oauthNonceCookieName,
  oauthNonceCookiePath,
  readReturnToUnverified,
  verifyOAuthState,
} from "@/lib/oauth-state";
import { profileService } from "@/server/services/profile.service";
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

/** One-time use: the nonce cookie is cleared on every callback outcome. */
function redirectAndClearNonce(target: URL) {
  const response = NextResponse.redirect(target);
  response.cookies.set(oauthNonceCookieName("outlook"), "", {
    path: oauthNonceCookiePath("outlook"),
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  // Replaced by the verified value below; only used for error redirects.
  let returnTo = readReturnToUnverified(state);

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return redirectAndClearNonce(
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
      return redirectAndClearNonce(
        buildRedirectUrl(request, {
          returnTo,
          status: "error",
          message: oauthErrorDescription || oauthError,
        }),
      );
    }

    const cookieStore = await cookies();
    const verified = verifyOAuthState({
      provider: "outlook",
      state,
      cookieNonce: cookieStore.get(oauthNonceCookieName("outlook"))?.value,
    });
    returnTo = verified.returnTo;

    // The flow must finish as the same professional who started it.
    const profile = await profileService.getProfileByUserId(userId);
    if (!profile || profile.id !== verified.professionalId) {
      throw new Error(
        "This calendar connection was started from a different account. Please try connecting again.",
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

    return redirectAndClearNonce(
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

    return redirectAndClearNonce(
      buildRedirectUrl(request, {
        returnTo,
        status: "error",
        message,
      }),
    );
  }
}
