import Image from "next/image";
import { Quote, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicTestimonialItem = {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  content: string;
  avatarUrl?: string | null;
};

export interface PublicTestimonialsProps
  extends React.HTMLAttributes<HTMLElement> {
  testimonials: PublicTestimonialItem[];
  title?: string;
  description?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PublicTestimonials({
  className,
  testimonials,
  title = "Trusted by people who needed real results",
  description = "Social proof matters. Before someone applies to work with you, they should see why others trusted you and what happened after they did.",
  ...props
}: PublicTestimonialsProps) {
  if (!testimonials.length) {
    return null;
  }

  return (
    <section
      className={cn("border-b border-slate-200 bg-white", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">Social proof</Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl border-slate-200 bg-slate-50/70 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
                <Star className="size-5 fill-current" />
              </div>

              <div className="space-y-2">
                <CardTitle className="text-2xl">
                  Trust before the Gatekeeper
                </CardTitle>

                <p className="text-sm leading-6 text-slate-600">
                  This page should not feel like a cold booking link. It should
                  feel like a premium professional storefront that builds
                  confidence before a client applies.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Show proof next to the decision.
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Make expertise feel credible and premium.
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Help qualified leads commit faster.
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="rounded-2xl border-slate-200 bg-white shadow-sm"
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {testimonial.avatarUrl ? (
                        <Image
                          src={testimonial.avatarUrl}
                          alt={testimonial.name}
                          width={44}
                          height={44}
                          className="size-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {getInitials(testimonial.name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {testimonial.name}
                        </p>

                        {(testimonial.role || testimonial.company) ? (
                          <p className="truncate text-xs text-slate-500">
                            {[testimonial.role, testimonial.company]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Quote className="size-4" />
                    </div>
                  </div>

                  <blockquote className="mt-5 flex-1 text-sm leading-7 text-slate-700">
                    “{testimonial.content}”
                  </blockquote>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}