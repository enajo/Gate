import "server-only";

import { encryptText, decryptText } from "@/lib/crypto";
import type {
  CalendarProvider,
  GoogleCallbackPayload,
  GoogleOAuthTokens,
  GoogleOAuthUrlParams,
} from "@/types/google";
import {
  googleCallbackPayloadSchema,
  googleOAuthTokensSchema,
  googleOAuthUrlParamsSchema,
} from "@/server/validators/google.validator";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const GOOGLE_PROVIDER: CalendarProvider = "GOOGLE";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
];

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type GoogleOAuthStatePayload = {
  professionalId?: string;
  returnTo?: string;
  nonce?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function getGoogleClientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;

  if (!value) {
    throw new Error("Missing GOOGLE_CLIENT_ID.");
  }

  return value;
}

function getGoogleClientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET;

  if (!value) {
    throw new Error("Missing GOOGLE_CLIENT_SECRET.");
  }

  return value;
}

function getGoogleRedirectUri(): string {
  const value = process.env.GOOGLE_REDIRECT_URI;

  if (!value) {
    throw new Error("Missing GOOGLE_REDIRECT_URI.");
  }

  return value;
}

function toUrlSafeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromUrlSafeBase64(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Unexpected response format: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function mapTokenResponseToAppTokens(
  response: GoogleTokenResponse,
): GoogleOAuthTokens {
  return googleOAuthTokensSchema.parse({
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiryDate:
      typeof response.expires_in === "number"
        ? Date.now() + response.expires_in * 1000
        : null,
    scope: response.scope ?? null,
    tokenType: response.token_type ?? null,
    idToken: response.id_token ?? null,
  });
}

export const googleAuthService = {
  getAuthorizationUrl(params: GoogleOAuthUrlParams = {}): string {
    const parsed = googleOAuthUrlParamsSchema.parse(params);

    const query = new URLSearchParams({
      client_id: getGoogleClientId(),
      redirect_uri: getGoogleRedirectUri(),
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPES.join(" "),
      access_type: parsed.accessType ?? "offline",
      include_granted_scopes: "true",
      prompt: parsed.prompt ?? "consent",
    });

    if (parsed.state) {
      query.set("state", parsed.state);
    }

    return `${GOOGLE_AUTH_URL}?${query.toString()}`;
  },

  encodeState(payload: GoogleOAuthStatePayload): string {
    return toUrlSafeBase64(JSON.stringify(payload));
  },

  decodeState(state?: string | null): GoogleOAuthStatePayload | null {
    if (!state) {
      return null;
    }

    try {
      const decoded = fromUrlSafeBase64(state);
      return JSON.parse(decoded) as GoogleOAuthStatePayload;
    } catch {
      throw new Error("Invalid Google OAuth state.");
    }
  },

  async exchangeCodeForTokens(
    payload: GoogleCallbackPayload,
  ): Promise<GoogleOAuthTokens> {
    const parsed = googleCallbackPayloadSchema.parse(payload);

    const body = new URLSearchParams({
      code: parsed.code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const json = await parseJsonResponse<GoogleTokenResponse>(response);

    if (!response.ok || json.error) {
      throw new Error(
        json.error_description ||
          json.error ||
          "Failed to exchange Google OAuth code for tokens.",
      );
    }

    return mapTokenResponseToAppTokens(json);
  },

  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    if (!refreshToken?.trim()) {
      throw new Error("Missing refresh token.");
    }

    const body = new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const json = await parseJsonResponse<GoogleTokenResponse>(response);

    if (!response.ok || json.error) {
      throw new Error(
        json.error_description ||
          json.error ||
          "Failed to refresh Google access token.",
      );
    }

    return mapTokenResponseToAppTokens({
      ...json,
      refresh_token: json.refresh_token ?? refreshToken,
    });
  },

  async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    if (!accessToken?.trim()) {
      throw new Error("Missing access token.");
    }

    const response = await fetch(GOOGLE_USERINFO_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const json = await parseJsonResponse<GoogleUserInfo>(response);

    if (!response.ok || !json.email || !json.sub) {
      throw new Error("Failed to fetch Google user info.");
    }

    return json;
  },

  async exchangeCodeAndFetchProfile(payload: GoogleCallbackPayload): Promise<{
    tokens: GoogleOAuthTokens;
    user: GoogleUserInfo;
  }> {
    const tokens = await this.exchangeCodeForTokens(payload);
    const user = await this.getGoogleUserInfo(tokens.accessToken);

    return { tokens, user };
  },

  encryptToken(token: string): string {
    if (!token?.trim()) {
      throw new Error("Cannot encrypt an empty token.");
    }

    return encryptText(token);
  },

  decryptToken(encryptedToken: string): string {
    if (!encryptedToken?.trim()) {
      throw new Error("Cannot decrypt an empty token payload.");
    }

    return decryptText(encryptedToken);
  },

  encryptOAuthTokens(tokens: GoogleOAuthTokens): {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string | null;
    expiryDate?: number | null;
    scope?: string | null;
    tokenType?: string | null;
    idToken?: string | null;
  } {
    const parsed = googleOAuthTokensSchema.parse(tokens);

    return {
      accessTokenEncrypted: this.encryptToken(parsed.accessToken),
      refreshTokenEncrypted: parsed.refreshToken
        ? this.encryptToken(parsed.refreshToken)
        : null,
      expiryDate: parsed.expiryDate ?? null,
      scope: parsed.scope ?? null,
      tokenType: parsed.tokenType ?? null,
      idToken: parsed.idToken ?? null,
    };
  },

  decryptOAuthTokens(params: {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string | null;
    expiryDate?: number | null;
    scope?: string | null;
    tokenType?: string | null;
    idToken?: string | null;
  }): GoogleOAuthTokens {
    return googleOAuthTokensSchema.parse({
      accessToken: this.decryptToken(params.accessTokenEncrypted),
      refreshToken: params.refreshTokenEncrypted
        ? this.decryptToken(params.refreshTokenEncrypted)
        : null,
      expiryDate: params.expiryDate ?? null,
      scope: params.scope ?? null,
      tokenType: params.tokenType ?? null,
      idToken: params.idToken ?? null,
    });
  },

  isTokenExpired(expiryDate?: number | null, bufferMs = 60_000): boolean {
    if (!expiryDate) {
      return false;
    }

    return Date.now() + bufferMs >= expiryDate;
  },
};