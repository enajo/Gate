"use client";

import * as React from "react";

export type AccessCodeItem = {
  id: string;
  codeLabel?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AccessCodeInput = {
  code: string;
  codeLabel?: string;
  isActive?: boolean;
};

type AccessCodesResponse = {
  accessCodes?: AccessCodeItem[];
  accessCode?: AccessCodeItem;
  error?: string;
};

export function useAccessCodes() {
  const [accessCodes, setAccessCodes] = React.useState<AccessCodeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAccessCodes = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/access-codes", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load access codes.");
      }

      setAccessCodes(data.accessCodes ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load access codes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAccessCodes();
  }, [loadAccessCodes]);

  async function createAccessCode(input: AccessCodeInput) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/access-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create access code.");
      }

      if (data.accessCode) {
        setAccessCodes((current) => [data.accessCode!, ...current]);
      } else {
        await loadAccessCodes();
      }

      return data.accessCode ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create access code.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateAccessCode(id: string, input: Partial<AccessCodeInput>) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/access-codes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update access code.");
      }

      if (data.accessCode) {
        setAccessCodes((current) =>
          current.map((item) => (item.id === id ? data.accessCode! : item)),
        );
      } else {
        await loadAccessCodes();
      }

      return data.accessCode ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update access code.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleAccessCode(id: string, isActive: boolean) {
    return updateAccessCode(id, { isActive });
  }

  return {
    accessCodes,
    isLoading,
    isSaving,
    error,
    refetch: loadAccessCodes,
    createAccessCode,
    updateAccessCode,
    toggleAccessCode,
  };
}