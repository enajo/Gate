"use client";

import * as React from "react";

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
  initialValues?: Partial<ServiceFormValues>;
  isSubmitting?: boolean;
  onSubmit?: (values: ServiceFormValues) => Promise<void> | void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  mode = "create",
  initialValues,
  isSubmitting = false,
  onSubmit,
}: ServiceDialogProps) {
  const isEdit = mode === "edit";

  async function handleSubmit(values: ServiceFormValues) {
    await onSubmit?.(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit service" : "Create a new service"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your service details, pricing, and public presentation."
              : "Add a new productized service for your public expert page."}
          </DialogDescription>
        </DialogHeader>

        <ServiceForm
          initialValues={initialValues}
          isSubmitting={isSubmitting}
          submitLabel={isEdit ? "Save changes" : "Create service"}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}