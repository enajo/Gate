"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TokenBalanceButton({
  professionalId,
  fullName,
  currentBalance,
}: {
  professionalId: string;
  fullName: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(String(currentBalance));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setValue(String(currentBalance));
      setError(null);
    }
  }

  async function handleConfirm() {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Enter a whole number, zero or greater.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/professionals/${professionalId}/token-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenBalance: parsed }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to update token balance.");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update token balance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Coins />
          Tokens
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set {fullName}&apos;s token balance</DialogTitle>
          <DialogDescription>
            Adjusts their remaining AI qualification allowance directly.
            This doesn&apos;t change their monthly reset schedule — it&apos;s
            a one-off top-up, not a plan change.
          </DialogDescription>
        </DialogHeader>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-900">
            Token balance
          </span>
          <Input
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={Boolean(error)}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
