import { Suspense } from "react";

import { LoadingState } from "@/components/shared/loading-state";
import { CalendarsView } from "./calendars-view";

export default function CalendarsPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          fullPage
          title="Loading calendars"
          description="Please wait while we fetch your connected calendars."
        />
      }
    >
      <CalendarsView />
    </Suspense>
  );
}
