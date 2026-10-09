import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tests the actual security wiring in /api/public/slots: that leadId is
// re-derived server-side (never trusted from the client), and that a
// mismatched/missing/non-strong-fit lead always falls back to standard
// access rather than throwing or silently granting priority.

const mockProfileRepository = vi.hoisted(() => ({
  findBySlug: vi.fn(),
}));

const mockBookingRepository = vi.hoisted(() => ({
  findLeadByIdForProfessional: vi.fn(),
}));

const mockAvailabilityService = vi.hoisted(() => ({
  getPublicBookableSlots: vi.fn(),
}));

const mockTransformSlots = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

vi.mock("@/server/repositories/booking.repository", () => ({
  bookingRepository: mockBookingRepository,
}));

vi.mock("@/server/services/availability.service", () => ({
  availabilityService: mockAvailabilityService,
}));

vi.mock("@/server/services/public-sales-page.service", () => ({
  transformSlots: mockTransformSlots,
}));

import { GET } from "@/app/api/public/slots/route";

const PROFESSIONAL = {
  id: "professional_1",
  slug: "jane-expert",
  timezone: "Europe/Berlin",
};

const STRONG_FIT_LEAD = {
  id: "lead_1",
  professionalId: "professional_1",
  serviceId: "service_1",
  isStrongFit: true,
};

function buildRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/public/slots");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url);
}

const BASE_PARAMS = {
  slug: "jane-expert",
  serviceId: "service_1",
  startDate: "2026-11-01T00:00:00.000Z",
  endDate: "2026-11-15T00:00:00.000Z",
};

describe("GET /api/public/slots — dynamic slot priority access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileRepository.findBySlug.mockResolvedValue(PROFESSIONAL);
    mockAvailabilityService.getPublicBookableSlots.mockResolvedValue({
      slots: [],
      blockedRanges: [],
    });
    mockTransformSlots.mockReturnValue({ availableDates: [], slotsPerDate: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests standard slots (includePriorityRules: false) when no leadId is given", async () => {
    const res = await GET(buildRequest(BASE_PARAMS));

    expect(res.status).toBe(200);
    expect(mockBookingRepository.findLeadByIdForProfessional).not.toHaveBeenCalled();
    expect(mockAvailabilityService.getPublicBookableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ includePriorityRules: false }),
    );
  });

  it("falls back to standard access when the lead belongs to a different professional/service", async () => {
    // findLeadByIdForProfessional itself returns null for a professionalId
    // mismatch (it's scoped in the query) — simulating that here.
    mockBookingRepository.findLeadByIdForProfessional.mockResolvedValue(null);

    const res = await GET(buildRequest({ ...BASE_PARAMS, leadId: "lead_from_elsewhere" }));

    expect(res.status).toBe(200);
    expect(mockAvailabilityService.getPublicBookableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ includePriorityRules: false }),
    );
  });

  it("falls back to standard access when the lead belongs to a different service on the same professional", async () => {
    mockBookingRepository.findLeadByIdForProfessional.mockResolvedValue({
      ...STRONG_FIT_LEAD,
      serviceId: "a_different_service",
    });

    const res = await GET(buildRequest({ ...BASE_PARAMS, leadId: "lead_1" }));

    expect(res.status).toBe(200);
    expect(mockAvailabilityService.getPublicBookableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ includePriorityRules: false }),
    );
  });

  it("falls back to standard access when the lead exists but isn't strong-fit", async () => {
    mockBookingRepository.findLeadByIdForProfessional.mockResolvedValue({
      ...STRONG_FIT_LEAD,
      isStrongFit: false,
    });

    const res = await GET(buildRequest({ ...BASE_PARAMS, leadId: "lead_1" }));

    expect(res.status).toBe(200);
    expect(mockAvailabilityService.getPublicBookableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ includePriorityRules: false }),
    );
  });

  it("grants priority access only for a verified strong-fit lead on the matching professional + service", async () => {
    mockBookingRepository.findLeadByIdForProfessional.mockResolvedValue(STRONG_FIT_LEAD);

    const res = await GET(buildRequest({ ...BASE_PARAMS, leadId: "lead_1" }));

    expect(res.status).toBe(200);
    expect(mockBookingRepository.findLeadByIdForProfessional).toHaveBeenCalledWith(
      "lead_1",
      "professional_1",
    );
    expect(mockAvailabilityService.getPublicBookableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ includePriorityRules: true }),
    );
  });

  it("falls back to standard slots, with a clean 200, if the lead lookup itself throws", async () => {
    mockBookingRepository.findLeadByIdForProfessional.mockRejectedValue(
      new Error("transient DB error"),
    );

    const res = await GET(buildRequest({ ...BASE_PARAMS, leadId: "lead_1" }));

    // A transient lookup failure must never break the whole slots request —
    // resolvePriorityAccess catches internally and falls back, so even a
    // standard visitor's slots still come back cleanly.
    expect(res.status).toBe(200);
    expect(mockAvailabilityService.getPublicBookableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ includePriorityRules: false }),
    );
  });
});
