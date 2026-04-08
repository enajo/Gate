"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { AccessCodeForm, type AccessCodeFormValues } from "@/components/access-codes/access-code-form";
import { AccessCodeList } from "@/components/access-codes/access-code-list";
import type { AccessCodeRowValue } from "@/components/access-codes/access-code-row";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AccessCodesResponse = {
  accessCodes?: AccessCodeRowValue[];
  accessCode?: AccessCodeRowValue;
  error?: string;
};

export default function AccessCodesPage() {
  const [accessCodes, setAccessCodes] = React.useState<AccessCodeRowValue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [selectedAccessCode, setSelectedAccessCode] =
    React.useState<AccessCodeRowValue | null>(null);

  const loadAccessCodes = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/access-codes", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load access codes.");
      }

      setAccessCodes(data.accessCodes ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load access codes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAccessCodes();
  }, [loadAccessCodes]);

  function openCreateDialog() {
    setDialogMode("create");
    setSelectedAccessCode(null);
    setDialogOpen(true);
  }

  function openEditDialog(accessCode: AccessCodeRowValue) {
    setDialogMode("edit");
    setSelectedAccessCode(accessCode);
    setDialogOpen(true);
  }

  function mapInitialValues(
    accessCode: AccessCodeRowValue | null,
  ): Partial<AccessCodeFormValues> | undefined {
    if (!accessCode) {
      return undefined;
    }

    return {
      code: "",
      codeLabel: accessCode.codeLabel ?? "",
      isActive: accessCode.isActive,
    };
  }

  async function handleSubmit(values: AccessCodeFormValues) {
    setIsSaving(true);
    setError(null);

    try {
      const isEdit = dialogMode === "edit" && selectedAccessCode?.id;
      const endpoint = isEdit
        ? `/api/app/access-codes/${selectedAccessCode.id}`
        : "/api/app/access-codes";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to ${isEdit ? "update" : "create"} access code.`,
        );
      }

      if (data.accessCode) {
        setAccessCodes((current) => {
          if (isEdit) {
            return current.map((item) =>
              item.id === data.accessCode!.id ? data.accessCode! : item,
            );
          }

          return [data.accessCode!, ...current];
        });
      } else {
        await loadAccessCodes();
      }

      setDialogOpen(false);
      setSelectedAccessCode(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save access code.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(accessCode: AccessCodeRowValue) {
    setError(null);

    try {
      const response = await fetch(`/api/app/access-codes/${accessCode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !accessCode.isActive,
        }),
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update access code.");
      }

      if (data.accessCode) {
        setAccessCodes((current) =>
          current.map((item) =>
            item.id === data.accessCode!.id ? data.accessCode! : item,
          ),
        );
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update access code.",
      );
    }
  }

  async function handleDelete(accessCode: AccessCodeRowValue) {
    setError(null);

    try {
      const response = await fetch(`/api/app/access-codes/${accessCode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
          deleted: true,
        }),
      });

      const data = (await response.json()) as AccessCodesResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to remove access code.");
      }

      setAccessCodes((current) =>
        current.filter((item) => item.id !== accessCode.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove access code.",
      );
    }
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Access codes"
          description="Create and manage the codes that control who can finalize a booking after selecting a slot."
          maxWidth="full"
        />
      }
      actions={
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add access code
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading access codes"
          description="Please wait while we fetch your booking access controls."
        />
      ) : error && accessCodes.length === 0 ? (
        <ErrorState
          inset
          title="Could not load access codes"
          description={error}
        />
      ) : (
        <div className="space-y-4">
          {error ? (
            <ErrorState
              inset
              title="Something went wrong"
              description={error}
            />
          ) : null}

          <AccessCodeList
            accessCodes={accessCodes}
            onCreate={openCreateDialog}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit"
                ? "Edit access code"
                : "Create access code"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update the label and status for this booking access code."
                : "Create a new code that clients can use to confirm bookings."}
            </DialogDescription>
          </DialogHeader>

          <AccessCodeForm
            initialValues={mapInitialValues(selectedAccessCode)}
            isSubmitting={isSaving}
            submitLabel={
              dialogMode === "edit" ? "Save changes" : "Create access code"
            }
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}