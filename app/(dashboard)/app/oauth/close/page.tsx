import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

import { OAuthCloseView } from "./oauth-close-view";

function ClosingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-ink">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-ink text-white">
        <CheckCircle2 className="size-6" />
      </div>
      <p className="text-[15px] font-medium">Google Calendar connected.</p>
      <p className="text-[13px] text-gray-500">Closing window…</p>
    </div>
  );
}

export default function OAuthClosePage() {
  return (
    <Suspense fallback={<ClosingFallback />}>
      <OAuthCloseView />
    </Suspense>
  );
}
