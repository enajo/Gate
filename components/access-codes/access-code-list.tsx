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
  onDelete,
  onToggleActive,
  emptyTitle = "No access codes yet",
  emptyDescription = "Generate access codes to control who can confirm bookings after selecting a slot.",
  createLabel = "Generate codes",
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

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {accessCodes.map((accessCode) => (
        <AccessCodeRow
          key={accessCode.id}
          accessCode={accessCode}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
