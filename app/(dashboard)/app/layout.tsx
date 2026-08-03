import * as React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { profileRepository } from "@/server/repositories/profile.repository";

export default async function AppDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";

  // Onboarding must stay reachable for users who don't have a Professional
  // profile yet — everything else under /app assumes one exists.
  if (!pathname.startsWith("/app/onboarding")) {
    const session = await auth();
    if (session?.user?.id) {
      const professional = await profileRepository.findByUserId(session.user.id);
      if (!professional) redirect("/onboarding");
    }
  }

  return <>{children}</>;
}