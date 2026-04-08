"use client";

import * as React from "react";
import {
  Clock3,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ServiceCardValue = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  active?: boolean;
};

export interface ServiceCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  service: ServiceCardValue;
  publicBasePath?: string;
  onEdit?: (service: ServiceCardValue) => void;
  onDelete?: (service: ServiceCardValue) => void;
  onToggleActive?: (service: ServiceCardValue) => void;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function ServiceCard({
  className,
  service,
  publicBasePath = "/",
  onEdit,
  onDelete,
  onToggleActive,
  ...props
}: ServiceCardProps) {
  const isActive = service.active ?? true;
  const publicUrl = service.slug
    ? `${publicBasePath.replace(/\/$/, "")}/${service.slug}`
    : null;

  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-200 shadow-sm transition-colors",
        !isActive && "opacity-80",
        className,
      )}
      {...props}
    >
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>

              <Badge variant="outline" className="gap-1">
                <Clock3 className="size-3.5" />
                {formatDuration(service.durationMinutes)}
              </Badge>
            </div>

            <CardTitle className="line-clamp-2 text-xl">
              {service.title}
            </CardTitle>
          </div>

          <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <MoreHorizontal className="size-4" />
          </div>
        </div>

        {service.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-slate-600">
            {service.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400">No description added yet.</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Price
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {service.displayPrice || "Custom pricing"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Public slug
            </p>
            <p className="mt-2 truncate text-sm font-medium text-slate-900">
              {service.slug || "Not set"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Preparation notes
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {service.preparationInstructions || "No preparation instructions yet."}
          </p>
        </div>

        {publicUrl ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Public URL:{" "}
            <span className="font-medium text-slate-900">{publicUrl}</span>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 pt-0">
        <Button type="button" variant="outline" onClick={() => onEdit?.(service)}>
          <Pencil className="size-4" />
          Edit
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => onToggleActive?.(service)}
        >
          <Power className="size-4" />
          {isActive ? "Deactivate" : "Activate"}
        </Button>

        {publicUrl ? (
          <Button asChild type="button" variant="ghost">
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Eye className="size-4" />
              Preview
            </a>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete?.(service)}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}