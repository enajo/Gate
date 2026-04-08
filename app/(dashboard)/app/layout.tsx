import * as React from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default function AppDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      sidebar={<DashboardSidebar />}
      header={
        <DashboardHeader
          title="Dashboard"
          description="Manage your profile, services, qualification flow, availability, calendars, access codes, and bookings."
        />
      }
    >
      {children}
    </DashboardShell>
  );
}