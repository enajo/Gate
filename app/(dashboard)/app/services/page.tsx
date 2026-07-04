"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { ServiceDialog } from "@/components/services/service-dialog";
import { ServiceList } from "@/components/services/service-list";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import type { ServiceCardValue } from "@/components/services/service-card";
import type { ServiceFormValues } from "@/components/services/service-form";

type ServicesPageResponse = {
  services?: ServiceCardValue[];
  service?: ServiceCardValue;
  error?: string;
};

export default function ServicesPage() {
  const [services, setServices] = React.useState<ServiceCardValue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [selectedService, setSelectedService] =
    React.useState<ServiceCardValue | null>(null);

  const loadServices = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/services", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ServicesPageResponse;

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

  function openCreateDialog() {
    setDialogMode("create");
    setSelectedService(null);
    setDialogOpen(true);
  }

  function openEditDialog(service: ServiceCardValue) {
    setDialogMode("edit");
    setSelectedService(service);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ServiceFormValues) {
    setIsSaving(true);
    setError(null);

    try {
      const isEdit = dialogMode === "edit" && selectedService?.id;
      const endpoint = isEdit
        ? `/api/app/services/${selectedService.id}`
        : "/api/app/services";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as ServicesPageResponse;

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to ${isEdit ? "update" : "create"} service.`,
        );
      }

      if (data.service) {
        setServices((current) => {
          if (isEdit) {
            return current.map((item) =>
              item.id === data.service!.id ? data.service! : item,
            );
          }

          return [data.service!, ...current];
        });
      } else {
        await loadServices();
      }

      setDialogOpen(false);
      setSelectedService(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save service.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(service: ServiceCardValue) {
    setError(null);

    try {
      const response = await fetch(`/api/app/services/${service.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as ServicesPageResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete service.");
      }

      setServices((current) => current.filter((item) => item.id !== service.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete service.",
      );
    }
  }

  async function handleToggleActive(service: ServiceCardValue) {
    setError(null);

    try {
      const response = await fetch(`/api/app/services/${service.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !service.active,
        }),
      });

      const data = (await response.json()) as ServicesPageResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update service.");
      }

      if (data.service) {
        setServices((current) =>
          current.map((item) =>
            item.id === data.service!.id ? data.service! : item,
          ),
        );
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update service.",
      );
    }
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Services"
          description="Create and manage the offers clients can apply for on your public expert page."
          maxWidth="full"
        />
      }
      actions={
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add service
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading services"
          description="Please wait while we fetch your service catalog."
        />
      ) : error && services.length === 0 ? (
        <ErrorState
          inset
          title="Could not load services"
          description={error}
        />
      ) : (
        <div className="space-y-4">
          {error ? (
            <ErrorState
              inset
              title="Something went wrong"
              description={error}
            />
          ) : null}

          <ServiceList
            services={services}
            onCreate={openCreateDialog}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        </div>
      )}

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        serviceId={selectedService?.id}
        initialValues={selectedService ? {
          ...selectedService,
          slug: selectedService.slug ?? undefined,
          description: selectedService.description ?? undefined,
          displayPrice: selectedService.displayPrice ?? undefined,
          preparationInstructions: selectedService.preparationInstructions ?? undefined,
          qualificationRequired: selectedService.qualificationRequired ?? false,
          idealPersonaDescription: selectedService.idealPersonaDescription,
          gateSetupAnswers: selectedService.gateSetupAnswers,
        } : undefined}
        isSubmitting={isSaving}
        onSubmit={handleSubmit}
        onGateSaved={() => void loadServices()}
      />
    </PageShell>
  );
}