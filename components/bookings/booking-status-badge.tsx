import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type BookingStatus =
  | "PENDING_CODE"
  | "CODE_INVALID"
  | "CONFIRMED"
  | "EVENT_CREATION_PENDING"
  | "EVENT_CREATED"
  | "CANCELLED";

export type BookingCalendarStatus = "PENDING" | "CREATED" | "FAILED" | null;

export interface BookingStatusBadgeProps {
  status: BookingStatus;
  calendarStatus?: BookingCalendarStatus;
}

function getStatusConfig(
  status: BookingStatus,
  calendarStatus: BookingCalendarStatus,
) {
  if (status === "EVENT_CREATED" || calendarStatus === "CREATED") {
    return {
      label: "Event created",
      variant: "success" as const,
      icon: CheckCircle2,
    };
  }

  if (status === "EVENT_CREATION_PENDING") {
    return {
      label: "Event pending",
      variant: "warning" as const,
      icon: Clock3,
    };
  }

  if (status === "CONFIRMED") {
    return {
      label: "Confirmed",
      variant: "success" as const,
      icon: CheckCircle2,
    };
  }

  if (status === "PENDING_CODE") {
    return {
      label: "Pending code",
      variant: "outline" as const,
      icon: Clock3,
    };
  }

  if (status === "CODE_INVALID") {
    return {
      label: "Invalid code",
      variant: "destructive" as const,
      icon: AlertTriangle,
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Cancelled",
      variant: "secondary" as const,
      icon: XCircle,
    };
  }

  if (calendarStatus === "FAILED") {
    return {
      label: "Calendar failed",
      variant: "destructive" as const,
      icon: AlertTriangle,
    };
  }

  return {
    label: status,
    variant: "outline" as const,
    icon: Clock3,
  };
}

export function BookingStatusBadge({
  status,
  calendarStatus = null,
}: BookingStatusBadgeProps) {
  const config = getStatusConfig(status, calendarStatus);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className="size-3.5" />
      {config.label}
    </Badge>
  );
}