"use client";

import * as React from "react";
import { KeyRound, Plus } from "lucide-react";

import { AccessCodeRow, type AccessCodeRowValue } from "@/components/access-codes/access-code-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AccessCodeListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  accessCodes: AccessCodeRowValue[];
  onCreate?: () => void;
  onEdit?: (accessCode: AccessCodeRowValue) => void;
  onDelete?: (accessCode: AccessCodeRowValue) => void;
  onToggleActive?: (accessCode: AccessCodeRowValue) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  createLabel?: string;
}

export function AccessCodeList({
  className,
  accessCodes,
  onCreate,
  onEdit,
  onDelete,
  onToggleActive,
  emptyTitle = "No access codes yet",
  emptyDescription = "Create access codes to control who can confirm bookings after selecting a slot.",
  createLabel = "Create access code",
  ...props
}: AccessCodeListProps) {
  if (!accessCodes.length) {
    return (
      <EmptyState
        className={className}
        icon={<KeyRound className="size-5 text-slate-500" />}
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
        inset
        {...props}
      />
    );
  }

  const sortedAccessCodes = accessCodes
    .slice()
    .sort((a, b) => {
      if (a.isActive === b.isActive) {
        return a.createdAt && b.createdAt
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : 0;
      }

      return a.isActive ? -1 : 1;
    });

  return (
    <div className={cn("space-y-3", className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Access codes</h3>
          <p className="text-sm text-slate-500">
            Manage active and inactive codes for private booking access.
          </p>
        </div>

        {onCreate ? (
          <Button type="button" onClick={onCreate}>
            <Plus className="size-4" />
            {createLabel}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {sortedAccessCodes.map((accessCode) => (
          <AccessCodeRow
            key={accessCode.id}
            accessCode={accessCode}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
          />
        ))}
      </div>
    </div>
  );
}