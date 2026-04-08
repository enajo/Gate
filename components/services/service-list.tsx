"use client";

import * as React from "react";
import { Layers3, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ServiceCard, type ServiceCardValue } from "@/components/services/service-card";

export interface ServiceListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  services: ServiceCardValue[];
  publicBasePath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  createLabel?: string;
  onCreate?: () => void;
  onEdit?: (service: ServiceCardValue) => void;
  onDelete?: (service: ServiceCardValue) => void;
  onToggleActive?: (service: ServiceCardValue) => void;
}

export function ServiceList({
  className,
  services,
  publicBasePath = "/",
  emptyTitle = "No services yet",
  emptyDescription = "Create your first service to define what clients can apply for on your public page.",
  createLabel = "Create service",
  onCreate,
  onEdit,
  onDelete,
  onToggleActive,
  ...props
}: ServiceListProps) {
  if (!services.length) {
    return (
      <EmptyState
        className={className}
        icon={<Layers3 className="size-5 text-slate-500" />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          onCreate ? (
            <Button type="button" onClick={onCreate}>
              <Plus className="size-4" />
              {createLabel}
            </Button>
          ) : null
        }
        {...props}
      />
    );
  }

  return (
    <div
      className={cn("grid gap-6 md:grid-cols-2 xl:grid-cols-3", className)}
      {...props}
    >
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          publicBasePath={publicBasePath}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}