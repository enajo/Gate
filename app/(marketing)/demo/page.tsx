import { PublicBookingForm } from "@/components/public-page/public-booking-form";
import { PublicGatekeeper } from "@/components/public-page/public-gatekeeper";
import { PublicHero } from "@/components/public-page/public-hero";
import { PublicServices } from "@/components/public-page/public-services";
import { PublicSlotPicker } from "@/components/public-page/public-slot-picker";
import { PublicSuccess } from "@/components/public-page/public-success";
import { PublicTestimonials } from "@/components/public-page/public-testimonials";

const demoProfessional = {
  fullName: "John Carter",
  title: "Fractional CTO",
  headline:
    "I help SaaS founders fix product bottlenecks before they become growth problems.",
  bio: "Fractional CTO working with early-stage SaaS teams on architecture, product systems, hiring, and technical strategy.",
  avatarUrl:
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
  socialLinks: {
    website: "https://example.com/john",
    linkedin: "https://linkedin.com/in/john-carter",
    x: "https://x.com/johncarter",
  },
  brandSettings: {
    primaryColor: "#111827",
    accentColor: "#8B5CF6",
  },
};

const demoServices = [
  {
    id: "svc_demo_strategy",
    title: "Fractional CTO Strategy Session",
    slug: "fractional-cto-strategy-session",
    description:
      "A focused strategy call for founders who need clarity on product architecture, roadmap bottlenecks, or technical hiring.",
    displayPrice: "€250",
    durationMinutes: 45,
    preparationInstructions:
      "Bring your current product stage, main bottleneck, and one technical decision you need clarity on.",
    active: true,
  },
  {
    id: "svc_demo_audit",
    title: "SaaS Product Systems Audit",
    slug: "saas-product-systems-audit",
    description:
      "A deeper review session covering delivery, architecture, product systems, and engineering priorities.",
    displayPrice: "€500",
    durationMinutes: 90,
    preparationInstructions:
      "Share architecture notes, roadmap docs, or team structure before the session.",
    active: true,
  },
];

const demoTestimonials = [
  {
    id: "t1",
    name: "Marta Nowak",
    role: "Founder",
    company: "Flowstack",
    content:
      "John helped us identify the exact engineering bottleneck slowing our roadmap. Best strategic session we booked all quarter.",
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "t2",
    name: "David Kim",
    role: "CEO",
    company: "Orbitlane",
    content:
      "Clear, direct, and worth the money. He turned a messy technical situation into a prioritized plan in one call.",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  },
];

const demoQuestions = [
  {
    id: "q1",
    questionText: "What is your current monthly revenue in EUR?",
    questionType: "NUMBER" as const,
    helpText:
      "This helps me understand your stage and whether this session is the right fit.",
    isRequired: true,
  },
  {
    id: "q2",
    questionText: "What is your biggest technical blocker right now?",
    questionType: "LONG_TEXT" as const,
    helpText: "Be specific. A good answer makes the session much more useful.",
    isRequired: true,
  },
  {
    id: "q3",
    questionText: "How urgent is solving this problem?",
    questionType: "MULTIPLE_CHOICE" as const,
    optionsJson: ["This week", "This month", "Just exploring"],
    helpText:
      "Urgency helps decide whether this should become a direct session or another resource.",
    isRequired: true,
  },
];

const demoSuccess = {
  bookingId: "demo_booking_001",
  professionalName: "John Carter",
  serviceTitle: "Fractional CTO Strategy Session",
  slotStart: "2026-04-15T10:00:00.000Z",
  slotEnd: "2026-04-15T10:45:00.000Z",
  timezone: "Europe/Berlin",
  meetingUrl: "https://meet.google.com/demo-room",
  eventUrl: "https://calendar.google.com",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicHero
        professional={demoProfessional}
        ctaLabel="Apply to work with me"
        ctaHref="#gatekeeper"
      />

      <PublicTestimonials testimonials={demoTestimonials} />

      <PublicServices
        services={demoServices}
        selectedServiceId={demoServices[0].id}
      />

      <PublicGatekeeper
        professionalId="demo_professional"
        serviceId={demoServices[0].id}
        serviceTitle={demoServices[0].title}
        questions={demoQuestions}
      />

      <PublicSlotPicker
        slug="john-carter"
        serviceId={demoServices[0].id}
        isUnlocked={true}
        selectedSlotStart="2026-04-15T10:00:00.000Z"
      />

      <PublicBookingForm
        professionalId="demo_professional"
        serviceId={demoServices[0].id}
        leadId="demo_lead"
        selectedSlot={{
          start: "2026-04-15T10:00:00.000Z",
          end: "2026-04-15T10:45:00.000Z",
        }}
        isUnlocked={true}
        timezone="Europe/Berlin"
        serviceTitle={demoServices[0].title}
      />

      <PublicSuccess success={demoSuccess} />
    </main>
  );
}