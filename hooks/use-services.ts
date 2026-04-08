"use client";

import * as React from "react";

export type ServiceData = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  active?: boolean;
};

type ServicesResponse = {
  services?: ServiceData[];
  service?: ServiceData;
  error?: string;
};

export function useServices() {
  const [services, setServices] = React.useState<ServiceData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadServices = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/services", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load services.");
      }

      setServices(data.services ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load services.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadServices();
  }, [loadServices]);

  async function createService(input: Omit<ServiceData, "id">) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/app/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create service.");
      }

      if (data.service) {
        setServices((current) => [data.service!, ...current]);
      } else {
        await loadServices();
      }

      return data.service ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create service.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateService(id: string, input: Partial<ServiceData>) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/services/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update service.");
      }

      if (data.service) {
        setServices((current) =>
          current.map((item) => (item.id === id ? data.service! : item)),
        );
      } else {
        await loadServices();
      }

      return data.service ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update service.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteService(id: string) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/services/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete service.");
      }

      setServices((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete service.",
      );
      throw deleteError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    services,
    isLoading,
    isSaving,
    error,
    refetch: loadServices,
    createService,
    updateService,
    deleteService,
  };
}