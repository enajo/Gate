import "server-only";

import type { CalendarAccount } from "@/types/google";
import type { OutlookCallbackPayload } from "@/types/outlook";
import {
  OUTLOOK_PROVIDER,
  outlookAuthService,
} from "@/server/services/outlook-auth.service";
import {
  ensureDefaultEventCalendar,
  googleSyncService,
} from "@/server/services/google-sync.service";
import { googleRepository } from "@/server/repositories/google.repository";
import { profileRepository } from "@/server/repositories/profile.repository";

const MICROSOFT_GRAPH_CALENDARS_URL = "https://graph.microsoft.com/v1.0/me/calendars";

type OutlookRemoteCalendar = {
  id: string;
  summary: string;
  timeZone: string | null;
  isDefaultCalendar: boolean;
};

type OutlookCalendarListResponse = {
  value?: Array<{
    id: string;
    name?: string;
    isDefaultCalendar?: boolean;
  }>;
};

function mapCalendarAccount(
  account: Awaited<ReturnType<typeof googleRepository.findCalendarAccountById>>,
): CalendarAccount | null {
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    professionalId: account.professionalId,
    provider: account.provider,
    externalAccountId: account.externalAccountId,
    externalCalendarId: account.externalCalendarId,
    providerEmail: account.providerEmail,
    calendarName: account.calendarName,
    calendarTimeZone: account.calendarTimeZone,
    accessTokenEncrypted: account.accessTokenEncrypted,
    refreshTokenEncrypted: account.refreshTokenEncrypted,
    syncStatus: account.syncStatus,
    isActive: account.isActive,
    useForConflictCheck: account.useForConflictCheck,
    isDefaultEventCalendar: account.isDefaultEventCalendar,
    lastSyncedAt: account.lastSyncedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function fetchRemoteCalendars(
  accessToken: string,
): Promise<OutlookRemoteCalendar[]> {
  const response = await fetch(MICROSOFT_GRAPH_CALENDARS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch Outlook calendars.");
  }

  const json = (await response.json()) as OutlookCalendarListResponse;

  return (json.value ?? []).map((item) => ({
    id: item.id,
    summary: item.name ?? item.id,
    timeZone: null,
    isDefaultCalendar: item.isDefaultCalendar ?? false,
  }));
}

export const outlookSyncService = {
  async getAuthorizationUrl(params?: {
    professionalId?: string;
    returnTo?: string;
    nonce?: string;
  }): Promise<string> {
    const state = outlookAuthService.encodeState({
      professionalId: params?.professionalId,
      returnTo: params?.returnTo,
      nonce: params?.nonce,
    });

    return outlookAuthService.getAuthorizationUrl({ state });
  },

  async connectOutlookAccountFromCallback(
    userId: string,
    payload: OutlookCallbackPayload,
  ): Promise<{
    providerEmail: string;
    calendars: CalendarAccount[];
    defaultCalendarId?: string | null;
  }> {
    const professional = await requireProfessionalByUserId(userId);
    const { tokens, user } =
      await outlookAuthService.exchangeCodeAndFetchProfile(payload);

    const encrypted = outlookAuthService.encryptOAuthTokens(tokens);
    const remoteCalendars = await fetchRemoteCalendars(tokens.accessToken);

    const syncedCalendars: CalendarAccount[] = [];

    for (const remoteCalendar of remoteCalendars) {
      const existing = await googleRepository.findByExternalCalendar({
        provider: OUTLOOK_PROVIDER,
        externalAccountId: user.id,
        externalCalendarId: remoteCalendar.id,
      });

      const shouldBeDefault = remoteCalendar.isDefaultCalendar === true;

      if (existing) {
        const updated = await googleRepository.updateCalendarAccountById(
          existing.id,
          {
            providerEmail: user.email,
            calendarName: remoteCalendar.summary,
            calendarTimeZone: remoteCalendar.timeZone,
            accessTokenEncrypted: encrypted.accessTokenEncrypted,
            // Microsoft always rotates the refresh token — unlike the
            // Google flow, don't fall back to the existing one here either.
            refreshTokenEncrypted: encrypted.refreshTokenEncrypted,
            syncStatus: "CONNECTED",
            isActive: true,
            useForConflictCheck: existing.useForConflictCheck,
            isDefaultEventCalendar:
              existing.isDefaultEventCalendar || shouldBeDefault,
            lastSyncedAt: new Date(),
          },
        );

        syncedCalendars.push(mapCalendarAccount(updated)!);
        continue;
      }

      const created = await googleRepository.createCalendarAccountForProfessional(
        professional.id,
        {
          provider: OUTLOOK_PROVIDER,
          externalAccountId: user.id,
          externalCalendarId: remoteCalendar.id,
          providerEmail: user.email,
          calendarName: remoteCalendar.summary,
          calendarTimeZone: remoteCalendar.timeZone,
          accessTokenEncrypted: encrypted.accessTokenEncrypted,
          refreshTokenEncrypted: encrypted.refreshTokenEncrypted ?? null,
          syncStatus: "CONNECTED",
          isActive: true,
          useForConflictCheck: true,
          isDefaultEventCalendar: shouldBeDefault,
          lastSyncedAt: new Date(),
        },
      );

      syncedCalendars.push(mapCalendarAccount(created)!);
    }

    const defaultCalendar = await ensureDefaultEventCalendar(professional.id);

    return {
      providerEmail: user.email,
      calendars: syncedCalendars,
      defaultCalendarId: defaultCalendar?.id ?? null,
    };
  },

  // The four methods below are already fully provider-agnostic underneath
  // (googleRepository's queries filter by professionalId, never by
  // provider) — delegate straight through rather than reimplementing them.
  async listConnectedCalendars(userId: string): Promise<CalendarAccount[]> {
    return googleSyncService.listConnectedCalendars(userId);
  },

  async setCalendarActiveState(
    userId: string,
    calendarAccountId: string,
    isActive: boolean,
  ): Promise<CalendarAccount> {
    return googleSyncService.setCalendarActiveState(
      userId,
      calendarAccountId,
      isActive,
    );
  },

  async setCalendarConflictCheckState(
    userId: string,
    calendarAccountId: string,
    useForConflictCheck: boolean,
  ): Promise<CalendarAccount> {
    return googleSyncService.setCalendarConflictCheckState(
      userId,
      calendarAccountId,
      useForConflictCheck,
    );
  },

  async setDefaultEventCalendar(
    userId: string,
    calendarAccountId: string,
  ): Promise<CalendarAccount> {
    return googleSyncService.setDefaultEventCalendar(userId, calendarAccountId);
  },
};
