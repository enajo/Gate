"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicServiceItem = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  active?: boolean;
};

export interface PublicServicesProps
  extends React.HTMLAttributes<HTMLElement> {
  services: PublicServiceItem[];
  selectedServiceId?: string | null;
  onSelectService?: (service: PublicServiceItem) => void;
  ctaHref?: string;
  title?: string;
  description?: string;
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

export function PublicServices({
  className,
  services,
  selectedServiceId,
  onSelectService,
  ctaHref = "#gatekeeper",
  title = "Choose the right service",
  description = "Start by selecting the offer that best fits your current need. Once selected, you’ll continue through the qualification flow before booking is unlocked.",
  ...props
}: PublicServicesProps) {
  const [internalSelectedServiceId, setInternalSelectedServiceId] =
    React.useState<string | null>(selectedServiceId ?? services[0]?.id ?? null);

  React.useEffect(() => {
    if (selectedServiceId !== undefined) {
      setInternalSelectedServiceId(selectedServiceId);
    }
  }, [selectedServiceId]);

  const currentSelectedServiceId =
    selectedServiceId !== undefined ? selectedServiceId : internalSelectedServiceId;

  function handleSelect(service: PublicServiceItem) {
    if (selectedServiceId === undefined) {
      setInternalSelectedServiceId(service.id);
    }

    onSelectService?.(service);
  }

  return (
    <section
      className={cn("border-b border-slate-200 bg-slate-50/50", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">Services</Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const isSelected = currentSelectedServiceId === service.id;

            return (
              <Card
                key={service.id}
                className={cn(
                  "rounded-2xl border-slate-200 bg-white shadow-sm transition-all",
                  isSelected && "border-slate-900 shadow-md ring-1 ring-slate-900/10",
                )}
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{service.title}</CardTitle>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isSelected ? "default" : "outline"}>
                          {service.displayPrice || "Custom pricing"}
                        </Badge>

                        <Badge variant="secondary" className="gap-1">
                          <Clock3 className="size-3.5" />
                          {formatDuration(service.durationMinutes)}
                        </Badge>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-white">
                        <CheckCircle2 className="size-5" />
                      </div>
                    ) : null}
                  </div>

                  {service.description ? (
                    <CardDescription className="text-sm leading-6 text-slate-600">
                      {service.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>

                <CardContent className="space-y-5 pt-0">
                  {service.preparationInstructions ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Preparation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {service.preparationInstructions}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        What happens next
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Select this service, complete the qualification step,
                        and unlock booking if you’re the right fit.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      className="flex-1"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleSelect(service)}
                    >
                      {isSelected ? "Selected" : "Select service"}
                    </Button>

                    <Button asChild type="button" variant="ghost" className="flex-1">
                      <a href={ctaHref}>
                        Continue
                        <ArrowRight className="size-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}