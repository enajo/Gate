import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Unplug,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type CalendarSyncStatus =
  | "PENDING"
  | "CONNECTED"
  | "SYNCING"
  | "ERROR"
  | "EXPIRED"
  | "DISCONNECTED";

export interface SyncStatusBadgeProps {
  status: CalendarSyncStatus;
}

function getStatusConfig(status: CalendarSyncStatus) {
  switch (status) {
    case "CONNECTED":
      return {
        label: "Connected",
        variant: "success" as const,
        icon: CheckCircle2,
      };
    case "SYNCING":
      return {
        label: "Syncing",
        variant: "secondary" as const,
        icon: RefreshCw,
      };
    case "PENDING":
      return {
        label: "Pending",
        variant: "outline" as const,
        icon: Clock3,
      };
    case "ERROR":
      return {
        label: "Error",
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    case "EXPIRED":
      return {
        label: "Expired",
        variant: "warning" as const,
        icon: AlertTriangle,
      };
    case "DISCONNECTED":
      return {
        label: "Disconnected",
        variant: "secondary" as const,
        icon: Unplug,
      };
    default:
      return {
        label: status,
        variant: "outline" as const,
        icon: Clock3,
      };
  }
}

export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon
        className={`size-3.5 ${status === "SYNCING" ? "animate-spin" : ""}`}
      />
      {config.label}
    </Badge>
  );
}