import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden rounded-3xl bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-slate-900">
                <ShieldCheck className="size-6" />
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight">
                Log in to your expert dashboard
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Manage your public page, qualification rules, availability,
                access codes, and bookings from one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">
                Why professionals use this
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• Qualify leads before they see the calendar</li>
                <li>• Productize your services like a premium storefront</li>
                <li>• Control who gets access to your time</li>
              </ul>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="space-y-3 pb-2">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <p className="text-sm leading-6 text-slate-500">
                Sign in to continue building and managing your expert page.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <Button className="w-full" size="lg">
                Continue with Google
              </Button>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Google sign-in
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  This project is set up to use Google authentication for
                  professionals.
                </p>
              </div>

              <p className="text-sm text-slate-500">
                Don’t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-slate-900 underline underline-offset-4"
                >
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}