import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { bookingRepository } from "@/server/repositories/booking.repository";
import { OutcomeResponseView } from "./outcome-response-view";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
};

const VALID_RESULTS = ["WON", "LOST", "NO_RESPONSE"] as const;
type Result = (typeof VALID_RESULTS)[number];

export async function generateMetadata(): Promise<Metadata> {
  return { title: "How did it go? — Gate" };
}

export default async function OutcomePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { result } = await searchParams;

  const lead = await bookingRepository.findLeadByOutcomeToken(token);
  if (!lead) notFound();

  const preselected: Result | null = VALID_RESULTS.includes(result as Result)
    ? (result as Result)
    : null;

  return (
    <OutcomeResponseView
      token={token}
      visitorName={lead.name}
      serviceTitle={lead.service.title}
      initialOutcome={lead.outcome as Result | null}
      preselected={preselected}
    />
  );
}
