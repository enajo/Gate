import { Quote, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Marta Nowak",
    role: "Founder",
    company: "Flowstack",
    quote:
      "This completely changed how I handle inbound requests. I no longer waste time on calls that should never have reached my calendar.",
  },
  {
    name: "David Kim",
    role: "Fractional Operator",
    company: "Orbitlane",
    quote:
      "It feels less like a booking tool and more like a premium front desk for my business. The qualification flow makes my time feel valuable.",
  },
  {
    name: "Nina Rossi",
    role: "Career Mentor",
    company: "Independent",
    quote:
      "The best part is that the page actually sells for me. By the time someone reaches booking, they already understand my offer and why it matters.",
  },
];

const trustSignals = [
  "Turn booking links into premium expert pages",
  "Show credibility before the calendar appears",
  "Increase conversion with social proof in context",
];

export function TestimonialSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">Trust engine</Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Social proof that helps people book with confidence
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            The booking experience should not feel cold or generic. Your page
            should build trust, reinforce authority, and make the decision feel
            obvious before a client reaches the calendar.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6 lg:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
              </div>

              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                Trust is part of the booking flow
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Great experts already have proof scattered across LinkedIn,
                messages, screenshots, and recommendations. This section turns
                that trust into a visible sales asset on the page itself.
              </p>

              <div className="mt-6 space-y-3">
                {trustSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {signal}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="rounded-2xl border-slate-200 bg-white shadow-sm"
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Quote className="size-5" />
                  </div>

                  <blockquote className="mt-4 flex-1 text-sm leading-7 text-slate-700">
                    “{testimonial.quote}”
                  </blockquote>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {testimonial.role} · {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}