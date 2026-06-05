"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 rounded-full border border-warm-border-soft bg-white/45 px-3 py-1.5 text-[13px] text-gray-500 transition hover:border-ink-soft hover:text-ink"
    >
      <LogOut className="size-3.5" />
      Sign out
    </button>
  );
}
