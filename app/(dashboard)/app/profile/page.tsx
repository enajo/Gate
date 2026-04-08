"use client";

import * as React from "react";

import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";

type ProfilePageResponse = {
  profile?: Partial<ProfileFormValues> | null;
  onboarding?: unknown;
  error?: string;
};

export default function ProfilePage() {
  const [initialValues, setInitialValues] = React.useState<
    Partial<ProfileFormValues> | undefined
  >(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/profile", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ProfilePageResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load profile.");
      }

      setInitialValues(data.profile ?? {});
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load profile.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSubmit(values: ProfileFormValues) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as ProfilePageResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update profile.");
      }

      setInitialValues(data.profile ?? values);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update profile.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Profile"
          description="Manage your public identity, page branding, social links, and expert-page presentation."
          maxWidth="full"
        />
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading profile"
          description="Please wait while we fetch your profile settings."
        />
      ) : error && !initialValues ? (
        <ErrorState
          inset
          title="Could not load profile"
          description={error}
        />
      ) : (
        <div className="space-y-4">
          {error ? (
            <ErrorState
              inset
              title="Could not save profile"
              description={error}
            />
          ) : null}

          <ProfileForm
            initialValues={initialValues}
            isSubmitting={isSaving}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </PageShell>
  );
}