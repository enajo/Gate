"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { PublicBookingForm } from "@/components/public-page/public-booking-form";
import { PublicGatekeeper } from "@/components/public-page/public-gatekeeper";
import { PublicHero } from "@/components/public-page/public-hero";
import { PublicServices } from "@/components/public-page/public-services";
import { PublicSlotPicker } from "@/components/public-page/public-slot-picker";
import { PublicSuccess } from "@/components/public-page/public-success";
import { PublicTestimonials } from "@/components/public-page/public-testimonials";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { usePublicProfile } from "@/hooks/use-public-profile";

type PublicService = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  active?: boolean;
};

type PublicServicesResponse = {
  services?: PublicService[];
  error?: string;
};

type PublicQuestion = {
  id: string;
  questionText: string;
  questionType:
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "NUMBER"
    | "MULTIPLE_CHOICE"
    | "YES_NO";
  helpText?: string | null;
  optionsJson?: string[] | null;
  isRequired?: boolean;
  sortOrder?: number;
};

type PublicQuestionsResponse = {
  questions?: PublicQuestion[];
  error?: string;
};

function getDateRange(days = 14) {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + days);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export default function PublicProfessionalPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const { profile, isLoading, error } = usePublicProfile(slug);
  const bookingFlow = useBookingFlow();

  const [services, setServices] = React.useState<PublicService[]>([]);
  const [questions, setQuestions] = React.useState<PublicQuestion[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(false);
  const [questionsLoading, setQuestionsLoading] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(
    null,
  );

  const selectedService = React.useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  React.useEffect(() => {
    async function loadServices() {
      if (!slug) return;

      setServicesLoading(true);
      setPageError(null);

      try {
        const response = await fetch(`/api/public/services/${slug}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as PublicServicesResponse;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load services.");
        }

        const nextServices = (data.services ?? []).filter(
          (service) => service.active !== false,
        );

        setServices(nextServices);
        setSelectedServiceId((current) => current ?? nextServices[0]?.id ?? null);
      } catch (loadError) {
        setPageError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load services.",
        );
      } finally {
        setServicesLoading(false);
      }
    }

    void loadServices();
  }, [slug]);

  React.useEffect(() => {
    async function loadQuestions() {
      if (!selectedServiceId) {
        setQuestions([]);
        return;
      }

      setQuestionsLoading(true);
      setPageError(null);

      try {
        const params = new URLSearchParams({
          serviceId: selectedServiceId,
        });

        const response = await fetch(
          `/api/app/qualification/questions?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await response.json()) as PublicQuestionsResponse;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load qualification questions.");
        }

        setQuestions(
          (data.questions ?? []).slice().sort((a, b) => {
            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          }),
        );
      } catch (loadError) {
        setPageError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load qualification questions.",
        );
      } finally {
        setQuestionsLoading(false);
      }
    }

    void loadQuestions();
  }, [selectedServiceId]);

  React.useEffect(() => {
    async function loadSlotsAfterQualification() {
      if (
        !bookingFlow.evaluation ||
        bookingFlow.evaluation.result !== "QUALIFIED" ||
        !selectedServiceId ||
        !slug
      ) {
        return;
      }

      const { startDate, endDate } = getDateRange(14);

      try {
        await bookingFlow.loadSlots({
          slug,
          serviceId: selectedServiceId,
          startDate,
          endDate,
          timezone:
            profile?.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "UTC",
        });
      } catch {
        // handled in hook state
      }
    }

    void loadSlotsAfterQualification();
  }, [
    bookingFlow,
    bookingFlow.evaluation,
    profile?.timezone,
    selectedServiceId,
    slug,
  ]);

  const qualified =
    bookingFlow.evaluation?.result === "QUALIFIED" && !!bookingFlow.lead;

  const successPayload = bookingFlow.confirmation?.success
    ? {
        bookingId: bookingFlow.confirmation.success.bookingId ?? "",
        professionalName:
          bookingFlow.confirmation.success.professionalName ||
          profile?.fullName ||
          "",
        serviceTitle:
          bookingFlow.confirmation.success.serviceTitle ||
          selectedService?.title ||
          "",
        slotStart:
          bookingFlow.confirmation.success.slotStart ||
          bookingFlow.selectedSlot?.start ||
          "",
        slotEnd:
          bookingFlow.confirmation.success.slotEnd ||
          bookingFlow.selectedSlot?.end ||
          "",
        timezone:
          bookingFlow.confirmation.success.timezone ||
          profile?.timezone ||
          "UTC",
        meetingUrl: bookingFlow.confirmation.success.meetingUrl ?? null,
        eventUrl: bookingFlow.confirmation.success.eventUrl ?? null,
      }
    : null;

  if (isLoading || servicesLoading) {
    return (
      <main className="min-h-screen bg-white text-slate-900">
        <LoadingState
          fullPage
          title="Loading public page"
          description="Please wait while we prepare this expert page."
        />
      </main>
    );
  }

  if ((error || pageError) && !profile) {
    return (
      <main className="min-h-screen bg-white text-slate-900">
        <ErrorState
          fullPage
          title="Could not load this page"
          description={error || pageError || "This public page is unavailable."}
        />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-white text-slate-900">
        <ErrorState
          fullPage
          title="Professional not found"
          description="This public expert page does not exist or is no longer available."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicHero
        professional={profile}
        ctaLabel={profile.ctaText || "Apply to work with me"}
        ctaHref="#gatekeeper"
      />

      <PublicTestimonials testimonials={profile.testimonials ?? []} />

      <PublicServices
        services={services}
        selectedServiceId={selectedServiceId}
        onSelectService={(service) => {
          setSelectedServiceId(service.id);
          bookingFlow.resetFlow();
        }}
      />

      {questionsLoading ? (
        <LoadingState
          inset
          title="Loading qualification flow"
          description="Please wait while we prepare the Gatekeeper questions."
        />
      ) : (
        <PublicGatekeeper
          professionalId={profile.id || ""}
          serviceId={selectedServiceId}
          serviceTitle={selectedService?.title}
          questions={questions}
          onSubmitted={(payload) => {
            bookingFlow.resetFlow();
            // restore submitted state manually
            void bookingFlow.submitQualification({
              professionalId: profile.id || "",
              serviceId: selectedServiceId || "",
              name: payload.lead.name,
              email: payload.lead.email,
              answers: payload.answers,
            }).catch(() => undefined);
          }}
          onQualified={(payload) => {
            bookingFlow.resetFlow();
            void bookingFlow
              .submitQualification({
                professionalId: profile.id || "",
                serviceId: selectedServiceId || "",
                name: payload.lead.name,
                email: payload.lead.email,
                answers: payload.answers,
              })
              .catch(() => undefined);
          }}
          onRejected={(payload) => {
            bookingFlow.resetFlow();
            void bookingFlow
              .submitQualification({
                professionalId: profile.id || "",
                serviceId: selectedServiceId || "",
                name: payload.lead.name,
                email: payload.lead.email,
                answers: payload.answers,
              })
              .catch(() => undefined);
          }}
        />
      )}

      <PublicSlotPicker
        slug={slug}
        serviceId={selectedServiceId}
        isUnlocked={qualified}
        timezone={profile.timezone || "UTC"}
        selectedSlotStart={bookingFlow.selectedSlot?.start ?? null}
        onSelectSlot={(slot) => {
          bookingFlow.selectSlot(slot);
        }}
      />

      <PublicBookingForm
        professionalId={profile.id || ""}
        serviceId={selectedServiceId}
        leadId={bookingFlow.lead?.id ?? null}
        selectedSlot={bookingFlow.selectedSlot}
        isUnlocked={qualified}
        timezone={profile.timezone || "UTC"}
        serviceTitle={selectedService?.title}
        onSuccess={() => {
          // confirmation already handled by component’s internal requests
        }}
      />

      <PublicSuccess
        success={successPayload}
        eventCreationPending={
          bookingFlow.confirmation?.eventCreationRequired ?? false
        }
      />

      {bookingFlow.error ? (
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <ErrorState
            inset
            title="Booking flow issue"
            description={bookingFlow.error}
          />
        </div>
      ) : null}

      {pageError && profile ? (
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <ErrorState
            inset
            title="Some page data could not be loaded"
            description={pageError}
          />
        </div>
      ) : null}
    </main>
  );
}