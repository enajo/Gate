"use client";

import * as React from "react";

import { GateSetup, type GateSetupAnswers } from "@/components/services/gate-setup";
import { ServiceForm, type ServiceFormValues } from "@/components/services/service-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  serviceId?: string;
  initialValues?: Partial<ServiceFormValues> & {
    idealPersonaDescription?: string | null;
    gateSetupAnswers?: Record<string, string> | null;
  };
  isSubmitting?: boolean;
  onSubmit?: (values: ServiceFormValues) => Promise<void> | void;
  onGateSaved?: () => void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  mode = "create",
  serviceId,
  initialValues,
  isSubmitting = false,
  onSubmit,
  onGateSaved,
}: ServiceDialogProps) {
  const isEdit = mode === "edit";
  const [showGateSetup, setShowGateSetup] = React.useState(false);
  const [isGateConfigured, setIsGateConfigured] = React.useState(
    Boolean(initialValues?.idealPersonaDescription),
  );

  React.useEffect(() => {
    setIsGateConfigured(Boolean(initialValues?.idealPersonaDescription));
  }, [initialValues?.idealPersonaDescription]);

  async function handleSubmit(values: ServiceFormValues) {
    await onSubmit?.(values);
  }

  async function handleGateSave(compiledPrompt: string, answers: GateSetupAnswers) {
    if (!serviceId) return;

    const res = await fetch(`/api/app/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idealPersonaDescription: compiledPrompt,
        gateSetupAnswers: answers,
        qualificationRequired: true,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save gate. Please try again.");
    }

    setIsGateConfigured(true);
    setShowGateSetup(false);
    onGateSaved?.();
  }

  const title = showGateSetup
    ? "Set up qualification gate"
    : isEdit
    ? "Edit service"
    : "Create a new service";

  const description = showGateSetup
    ? "Answer 4 questions so your AI gate knows exactly who to qualify."
    : isEdit
    ? "Update your service details, pricing, and public presentation."
    : "Add a new productized service for your public expert page.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {showGateSetup && serviceId ? (
          <GateSetup
            serviceId={serviceId}
            serviceName={initialValues?.title}
            initialAnswers={initialValues?.gateSetupAnswers ?? undefined}
            initialPrompt={initialValues?.idealPersonaDescription}
            initialPhase={isGateConfigured ? "edit" : "chat"}
            onSave={handleGateSave}
            onCancel={() => setShowGateSetup(false)}
          />
        ) : (
          <ServiceForm
            initialValues={initialValues}
            isSubmitting={isSubmitting}
            submitLabel={isEdit ? "Save changes" : "Create service"}
            showGateSection={isEdit && Boolean(serviceId)}
            isGateConfigured={isGateConfigured}
            onOpenGateSetup={() => setShowGateSetup(true)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
