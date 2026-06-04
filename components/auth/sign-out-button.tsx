"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 rounded-full border border-[#D8D0C6] bg-white/45 px-3 py-1.5 text-[13px] text-[#6B7280] transition hover:border-[#475569] hover:text-[#2B2B2B]"
    >
      <LogOut className="size-3.5" />
      Sign out
    </button>
  );
}
