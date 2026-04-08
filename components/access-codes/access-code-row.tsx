"use client";

import * as React from "react";
import { KeyRound, Pencil, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type AccessCodeRowValue = {
  id: string;
  codeLabel?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export interface AccessCodeRowProps {
  accessCode: AccessCodeRowValue;
  onEdit?: (accessCode: AccessCodeRowValue) => void;
  onDelete?: (accessCode: AccessCodeRowValue) => void;
  onToggleActive?: (accessCode: AccessCodeRowValue) => void;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AccessCodeRow({
  accessCode,
  onEdit,
  onDelete,
  onToggleActive,
}: AccessCodeRowProps) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <KeyRound className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {accessCode.codeLabel?.trim() || "Untitled access code"}
              </p>
              <p className="text-xs text-slate-500">
                Created {formatDate(accessCode.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={accessCode.isActive ? "success" : "secondary"}>
              {accessCode.isActive ? "Active" : "Inactive"}
            </Badge>

            {accessCode.updatedAt ? (
              <Badge variant="outline">
                Updated {formatDate(accessCode.updatedAt)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onEdit?.(accessCode)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onToggleActive?.(accessCode)}
          >
            <Power className="size-4" />
            {accessCode.isActive ? "Deactivate" : "Activate"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDelete?.(accessCode)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}