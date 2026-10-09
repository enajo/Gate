import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { auth } from "@/lib/auth";
import {
  OAUTH_NONCE_COOKIE_MAX_AGE_SECONDS,
  createOAuthState,
  oauthNonceCookieName,
  oauthNonceCookiePath,
} from "@/lib/oauth-state";
import { profileService } from "@/server/services/profile.service";
import { googleSyncService } from "@/server/services/google-sync.service";

const googleConnectRequestSchema = z
  .object({
    returnTo: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid Google connect request",
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

  if (message === "Professional profile not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const json = await request.json().catch(() => ({}));
    const input = googleConnectRequestSchema.parse(json);

    const profile = await profileService.getProfileByUserId(userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Professional profile not found." },
        { status: 404 },
      );
    }

    const { state, nonce } = createOAuthState({
      provider: "google",
      professionalId: profile.id,
      returnTo: input.returnTo,
    });

    const authorizationUrl = await googleSyncService.getAuthorizationUrl({
      state,
    });

    const response = NextResponse.json(
      {
        authorizationUrl,
      },
      { status: 200 },
    );

    // Binds this flow to this browser — the callback rejects any state
    // whose nonce doesn't match. SameSite=Lax is still sent on the
    // provider's top-level redirect back to the callback.
    response.cookies.set(oauthNonceCookieName("google"), nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: oauthNonceCookiePath("google"),
      maxAge: OAUTH_NONCE_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}