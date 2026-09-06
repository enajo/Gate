import * as React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { profileRepository } from "@/server/repositories/profile.repository";
import { DashboardHeader } from "@/components/layout/dashboard-header";

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G"
  );
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export default async function AppDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const session = await auth();

  // Onboarding must stay reachable for users who don't have a Professional
  // profile yet — everything else under /app assumes one exists.
  const professional = session?.user?.id
    ? await profileRepository.findByUserId(session.user.id)
    : null;

  if (!pathname.startsWith("/app/onboarding") && session?.user?.id && !professional) {
    redirect("/onboarding");
  }

  const initials = getInitials(professional?.fullName ?? session?.user?.name ?? "");
  const publicUrl = professional?.slug
    ? `${getBaseUrl()}/${professional.slug}`
    : null;

  return (
    <>
      <DashboardHeader
        initials={initials}
        publicUrl={publicUrl}
        isAdmin={isAdmin(session)}
      />
      {children}
    </>
  );
}