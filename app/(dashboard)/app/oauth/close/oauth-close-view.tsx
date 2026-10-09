"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

/**
 * Minimal view that closes an OAuth popup window.
 *
 * After a calendar provider's callback route redirects here, this page:
 *   1. Sends a postMessage to the opener (the dashboard modal)
 *   2. Calls window.close()
 *
 * Provider-neutral: reads whichever of ?google=/?outlook= is present and
 * posts one shared message shape, {type: "CALENDAR_AUTH_COMPLETE", provider,
 * status}, so GoogleConnectButton and OutlookConnectButton share this same
 * close page instead of each needing their own.
 *
 * If somehow opened outside a popup (e.g. full-redirect fallback),
 * it redirects to /app instead.
 */
export function OAuthCloseView() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const googleStatus = searchParams.get("google");
    const outlookStatus = searchParams.get("outlook");
    const provider = googleStatus ? "google" : outlookStatus ? "outlook" : null;
    const status = googleStatus ?? outlookStatus ?? "complete";

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "CALENDAR_AUTH_COMPLETE", provider, status },
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-ink">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-ink text-white">
        <CheckCircle2 className="size-6" />
      </div>
      <p className="text-[15px] font-medium">Calendar connected.</p>
      <p className="text-[13px] text-gray-500">Closing window…</p>
    </div>
  );
}
