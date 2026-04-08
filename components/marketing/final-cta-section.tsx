import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const proofPoints = [
  "Qualify leads before they reach your calendar",
  "Turn your page into a premium expert storefront",
  "Monetize access instead of giving time away for free",
];

export function FinalCtaSection() {
  return (
    <section className="bg-slate-900 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
          <div className="grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-14">
            <div className="flex flex-col justify-center">
              <Badge
                variant="secondary"
                className="w-fit border-white/10 bg-white/10 text-white hover:bg-white/10"
              >
                The Gatekeeper for expert businesses
              </Badge>

              <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Stop letting anyone book your time.
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Build a page that filters bad-fit leads, sells your value, and
                only gives qualified people access to your calendar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  <Link href="/register">
                    Create your page
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/demo">See the demo</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-900">
                  <ShieldCheck className="size-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Your AI front desk
                  </p>
                  <p className="text-sm text-slate-400">
                    Filter. Convert. Monetize.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {proofPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    {point}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <Sparkles className="size-4" />
                  Not a scheduling tool
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-100/90">
                  This is a conversion system for solo experts who want control
                  over who earns access to their time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}