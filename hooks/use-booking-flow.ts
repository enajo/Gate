"use client";

import { useState } from "react";

type BookingStep = "service" | "qualification" | "slots" | "booking" | "success";

export function useBookingFlow() {
  const [step, setStep] = useState<BookingStep>("service");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<unknown>(null);
  const [qualificationResult, setQualificationResult] = useState<unknown>(null);

  return {
    step,
    setStep,
    selectedServiceId,
    setSelectedServiceId,
    selectedSlot,
    setSelectedSlot,
    qualificationResult,
    setQualificationResult,
    reset: () => {
      setStep("service");
      setSelectedServiceId(null);
      setSelectedSlot(null);
      setQualificationResult(null);
    },
  };
}
