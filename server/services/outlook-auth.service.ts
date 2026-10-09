import "server-only";

import { encryptText, decryptText } from "@/lib/crypto";
import type { CalendarProvider } from "@/types/google";
import type {
  OutlookCallbackPayload,
  OutlookOAuthTokens,
} from "@/types/outlook";
import {
  outlookCallbackPayloadSchema,
  outlookOAuthTokensSchema,
} from "@/server/validators/outlook.validator";

const MICROSOFT_AUTHORITY = "https://login.microsoftonline.com/common";
const MICROSOFT_AUTH_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize`;
const MICROSOFT_TOKEN_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;
const MICROSOFT_GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me";

export const OUTLOOK_PROVIDER: CalendarProvider = "OUTLOOK";

export const OUTLOOK_CALENDAR_SCOPES = [
  "offline_access",
  "openid",
  "email",
  "profile",
  "Calendars.ReadWrite",
  "User.Read",
];

type OutlookUserProfile = {
  id: string;
  mail?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
};

type OutlookOAuthStatePayload = {
  professionalId?: string;
  returnTo?: string;
  nonce?: string;
};

type OutlookTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function getMicrosoftClientId(): string {
  const value = process.env.MICROSOFT_CLIENT_ID;

  if (!value) {
    throw new Error("Missing MICROSOFT_CLIENT_ID.");
  }

  return value;
}

function getMicrosoftClientSecret(): string {
  const value = process.env.MICROSOFT_CLIENT_SECRET;

  if (!value) {
    throw new Error("Missing MICROSOFT_CLIENT_SECRET.");
  }

  return value;
}

function getMicrosoftRedirectUri(): string {
  const value = process.env.MICROSOFT_REDIRECT_URI;

  if (!value) {
    throw new Error("Missing MICROSOFT_REDIRECT_URI.");
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
  response: OutlookTokenResponse,
): OutlookOAuthTokens {
  return outlookOAuthTokensSchema.parse({
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiryDate:
      typeof response.expires_in === "number"
        ? Date.now() + response.expires_in * 1000
        : null,
    scope: response.scope ?? null,
    tokenType: response.token_type ?? null,
  });
}

export const outlookAuthService = {
  getAuthorizationUrl(params: { state?: string } = {}): string {
    const query = new URLSearchParams({
      client_id: getMicrosoftClientId(),
      redirect_uri: getMicrosoftRedirectUri(),
      response_type: "code",
      response_mode: "query",
      scope: OUTLOOK_CALENDAR_SCOPES.join(" "),
    });

    if (params.state) {
      query.set("state", params.state);
    }

    return `${MICROSOFT_AUTH_URL}?${query.toString()}`;
  },

  encodeState(payload: OutlookOAuthStatePayload): string {
    return toUrlSafeBase64(JSON.stringify(payload));
  },

  decodeState(state?: string | null): OutlookOAuthStatePayload | null {
    if (!state) {
      return null;
    }

    try {
      const decoded = fromUrlSafeBase64(state);
      return JSON.parse(decoded) as OutlookOAuthStatePayload;
    } catch {
      throw new Error("Invalid Outlook OAuth state.");
    }
  },

  async exchangeCodeForTokens(
    payload: OutlookCallbackPayload,
  ): Promise<OutlookOAuthTokens> {
    const parsed = outlookCallbackPayloadSchema.parse(payload);

    const body = new URLSearchParams({
      code: parsed.code,
      client_id: getMicrosoftClientId(),
      client_secret: getMicrosoftClientSecret(),
      redirect_uri: getMicrosoftRedirectUri(),
      scope: OUTLOOK_CALENDAR_SCOPES.join(" "),
      grant_type: "authorization_code",
    });

    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const json = await parseJsonResponse<OutlookTokenResponse>(response);

    if (!response.ok || json.error) {
      throw new Error(
        json.error_description ||
          json.error ||
          "Failed to exchange Outlook OAuth code for tokens.",
      );
    }

    return mapTokenResponseToAppTokens(json);
  },

  /**
   * Unlike Google (which only sometimes resends a refresh_token on refresh,
   * so the caller falls back to the old one), Microsoft's token endpoint
   * ALWAYS returns a new refresh_token on every refresh call. Whatever comes
   * back here must be persisted unconditionally by the caller — never fall
   * back to the previous refresh token the way Google's flow does.
   */
  async refreshAccessToken(refreshToken: string): Promise<OutlookOAuthTokens> {
    if (!refreshToken?.trim()) {
      throw new Error("Missing refresh token.");
    }

    const body = new URLSearchParams({
      client_id: getMicrosoftClientId(),
      client_secret: getMicrosoftClientSecret(),
      refresh_token: refreshToken,
      scope: OUTLOOK_CALENDAR_SCOPES.join(" "),
      grant_type: "refresh_token",
    });

    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const json = await parseJsonResponse<OutlookTokenResponse>(response);

    if (!response.ok || json.error) {
      throw new Error(
        json.error_description ||
          json.error ||
          "Failed to refresh Outlook access token.",
      );
    }

    return mapTokenResponseToAppTokens(json);
  },

  async getOutlookUserProfile(accessToken: string): Promise<OutlookUserProfile> {
    if (!accessToken?.trim()) {
      throw new Error("Missing access token.");
    }

    const response = await fetch(MICROSOFT_GRAPH_ME_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const json = await parseJsonResponse<OutlookUserProfile>(response);

    if (!response.ok || !json.id) {
      throw new Error("Failed to fetch Outlook user profile.");
    }

    return json;
  },

  async exchangeCodeAndFetchProfile(payload: OutlookCallbackPayload): Promise<{
    tokens: OutlookOAuthTokens;
    user: OutlookUserProfile & { email: string };
  }> {
    const tokens = await this.exchangeCodeForTokens(payload);
    const profile = await this.getOutlookUserProfile(tokens.accessToken);

    // Personal Microsoft accounts often leave `mail` null — fall back to
    // userPrincipalName, the Outlook analog of Google's verified `email`.
    const email = profile.mail ?? profile.userPrincipalName;

    if (!email) {
      throw new Error("Outlook account has no usable email address.");
    }

    return { tokens, user: { ...profile, email } };
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

  encryptOAuthTokens(tokens: OutlookOAuthTokens): {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string | null;
    expiryDate?: number | null;
    scope?: string | null;
    tokenType?: string | null;
  } {
    const parsed = outlookOAuthTokensSchema.parse(tokens);

    return {
      accessTokenEncrypted: this.encryptToken(parsed.accessToken),
      refreshTokenEncrypted: parsed.refreshToken
        ? this.encryptToken(parsed.refreshToken)
        : null,
      expiryDate: parsed.expiryDate ?? null,
      scope: parsed.scope ?? null,
      tokenType: parsed.tokenType ?? null,
    };
  },

  isTokenExpired(expiryDate?: number | null, bufferMs = 60_000): boolean {
    if (!expiryDate) {
      return false;
    }

    return Date.now() + bufferMs >= expiryDate;
  },
};
