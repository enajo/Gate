"use client";

import * as React from "react";
import { KeyRound, Power, Trash2, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type AccessCodeRowValue = {
  id: string;
  codeLabel?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  isActive: boolean;
  usedAt?: string | null;
  usedByEmail?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export interface AccessCodeRowProps {
  accessCode: AccessCodeRowValue;
  onDelete?: (accessCode: AccessCodeRowValue) => void;
  onToggleActive?: (accessCode: AccessCodeRowValue) => void;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

export function AccessCodeRow({
  accessCode,
  onDelete,
  onToggleActive,
}: AccessCodeRowProps) {
  const isUsed = Boolean(accessCode.usedAt);

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${
              isUsed ? "bg-slate-400" : "bg-slate-900"
            }`}
          >
            {isUsed ? (
              <UserCheck className="size-4" />
            ) : (
              <KeyRound className="size-4" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-slate-900">
              {accessCode.codeLabel?.trim() || "—"}
            </p>

            {isUsed ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                Used by {accessCode.usedByEmail ?? "unknown"} · {formatDate(accessCode.usedAt)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-400">
                Created {formatDate(accessCode.createdAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant={isUsed ? "secondary" : accessCode.isActive ? "success" : "secondary"}>
            {isUsed ? "Used" : accessCode.isActive ? "Available" : "Inactive"}
          </Badge>

          {!isUsed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggleActive?.(accessCode)}
            >
              <Power className="size-3.5" />
              {accessCode.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDelete?.(accessCode)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
