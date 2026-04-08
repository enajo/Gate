"use client";

import * as React from "react";
import { Bell, Shield, UserCog } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <PageShell
      header={
        <SectionHeading
          title="Settings"
          description="Manage your account preferences and operational defaults."
          maxWidth="full"
        />
      }
    >
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <UserCog className="size-5" />
              </div>
              <CardTitle>Account</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value="Professional account" readOnly />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value="you@example.com" readOnly />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Bell className="size-5" />
              </div>
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>Email notifications and booking alerts will be configured here.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              Notification settings placeholder for MVP.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Shield className="size-5" />
              </div>
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>Authentication and session controls will live here.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              Security settings placeholder for MVP.
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}