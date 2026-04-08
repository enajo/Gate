import { FeatureSection } from "@/components/marketing/feature-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { TestimonialSection } from "@/components/marketing/testimonial-section";

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <HeroSection />
      <FeatureSection />
      <HowItWorksSection />
      <TestimonialSection />
      <FinalCtaSection />
    </main>
  );
}