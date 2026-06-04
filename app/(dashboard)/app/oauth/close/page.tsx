"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

/**
 * Minimal page that closes an OAuth popup window.
 *
 * After Google redirects here (via the callback route), this page:
 *   1. Sends a postMessage to the opener (the dashboard modal)
 *   2. Calls window.close()
 *
 * If somehow opened outside a popup (e.g. full-redirect fallback),
 * it redirects to /app instead.
 */
export default function OAuthClosePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("google") ?? "complete";

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "GOOGLE_AUTH_COMPLETE", status },
          window.location.origin,
        );
        window.close();
        return;
      }
    } catch {
      // cross-origin guard — shouldn't happen but just in case
    }

    // Not in a popup — send back to dashboard
    window.location.replace("/app");
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F9FAFB] text-[#2B2B2B]">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#2B2B2B] text-white">
        <CheckCircle2 className="size-6" />
      </div>
      <p className="text-[15px] font-medium">Google Calendar connected.</p>
      <p className="text-[13px] text-[#6B7280]">Closing window…</p>
    </div>
  );
}
