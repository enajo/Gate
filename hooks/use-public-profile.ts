"use client";

import * as React from "react";

export type PublicProfileData = {
  id?: string;
  fullName?: string;
  slug?: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  ctaText?: string | null;
  brandSettings?: {
    theme?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    fontPair?: string | null;
  } | null;
  socialLinks?: {
    website?: string | null;
    linkedin?: string | null;
    x?: string | null;
  } | null;
  testimonials?: Array<{
    id: string;
    name: string;
    role?: string | null;
    company?: string | null;
    content: string;
    avatarUrl?: string | null;
  }> | null;
};

type PublicProfileResponse = {
  professional?: PublicProfileData;
  error?: string;
};

export function usePublicProfile(slug?: string | null) {
  const [profile, setProfile] = React.useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!slug) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/professionals/${slug}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as PublicProfileResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load public profile.");
      }

      setProfile(data.professional ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load public profile.",
      );
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: loadProfile,
  };
}