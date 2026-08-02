import type { LeadQualificationResult } from "@prisma/client";

export type BookingHoldStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CONVERTED"
  | "RELEASED";

export type BookingStatus =
  | "PENDING_APPROVAL"
  | "PENDING_PAYMENT"
  | "PENDING_CODE"
  | "CODE_INVALID"
  | "CONFIRMED"
  | "EVENT_CREATION_PENDING"
  | "EVENT_CREATED"
  | "CANCELLED"
  | "REJECTED";

export type CodeValidationStatus = "NOT_REQUIRED" | "PENDING" | "VALID" | "INVALID";

export type CalendarStatus = "NOT_REQUIRED" | "PENDING" | "CREATED" | "FAILED";

export type PaymentStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "DISPUTED";

export type ApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type BookingHold = {
  id: string;
  professionalId: string;
  serviceId: string;
  leadId?: string | null;
  slotStart: Date;
  slotEnd: Date;
  expiresAt: Date;
  status: BookingHoldStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type Booking = {
  id: string;
  professionalId: string;
  serviceId: string;
  leadId: string;
  holdId: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
  status: BookingStatus;
  // Phase 7 — manual approval: defaults to "NOT_REQUIRED" until schema migration
  approvalStatus?: ApprovalStatus;
  // Phase 6 — Stripe payment: defaults to "NOT_REQUIRED" until schema migration
  paymentStatus?: PaymentStatus;
  codeValidationStatus: CodeValidationStatus;
  calendarStatus: CalendarStatus;
  paymentIntentId?: string | null;
  meetingUrl?: string | null;
  eventUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Lead = {
  id: string;
  professionalId: string;
  serviceId: string;
  name: string;
  email: string;
  answersJson: Record<string, unknown>;
  qualificationResult: LeadQualificationResult;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBookingHoldInput = {
  professionalId: string;
  serviceId: string;
  leadId?: string | null;
  slotStart: Date | string;
  slotEnd: Date | string;
  expiresAt: Date | string;
};

export type CreateLeadInput = {
  professionalId: string;
  serviceId: string;
  name: string;
  email: string;
  answersJson: Record<string, unknown>;
  qualificationResult: LeadQualificationResult;
};

export type ConfirmBookingInput = {
  professionalId: string;
  serviceId: string;
  leadId: string;
  holdId: string;
  timezone: string;
  accessCode?: string | null;
  paymentIntentId?: string | null;
};

export type CreateBookingInput = {
  professionalId: string;
  serviceId: string;
  leadId: string;
  holdId: string;
  slotStart: Date | string;
  slotEnd: Date | string;
  timezone: string;
  status?: BookingStatus;
  approvalStatus?: ApprovalStatus;
  paymentStatus?: PaymentStatus;
  codeValidationStatus?: CodeValidationStatus;
  calendarStatus?: CalendarStatus;
  paymentIntentId?: string | null;
};

export type UpdateBookingStatusInput = {
  bookingId: string;
  status?: BookingStatus;
  approvalStatus?: ApprovalStatus;
  paymentStatus?: PaymentStatus;
  codeValidationStatus?: CodeValidationStatus;
  calendarStatus?: CalendarStatus;
  meetingUrl?: string | null;
  eventUrl?: string | null;
};

export type ReleaseBookingHoldInput = {
  holdId: string;
  status?: Extract<BookingHoldStatus, "EXPIRED" | "RELEASED">;
};

export type BookingSlotSelection = {
  serviceId: string;
  slotStart: string;
  slotEnd: string;
  timezone: string;
};

export type BookingConfirmationResult = {
  booking: Booking;
  isCodeValid: boolean;
  eventCreationRequired: boolean;
  // Phase 6 — Stripe: defaults to false until payment is implemented
  paymentRequired?: boolean;
  // Phase 7 — Manual approval: defaults to false until approval flow is implemented
  approvalRequired?: boolean;
};

export type BookingSummary = {
  id: string;
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
  status: BookingStatus;
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;
  codeValidationStatus: CodeValidationStatus;
  calendarStatus: CalendarStatus;
};

export type PublicBookingRequest = {
  slug: string;
  serviceId: string;
  name: string;
  email: string;
  answersJson: Record<string, unknown>;
  slotStart: string;
  slotEnd: string;
  timezone: string;
  accessCode?: string | null;
  paymentIntentId?: string | null;
};

export type PublicBookingSuccessPayload = {
  bookingId: string;
  professionalName: string;
  serviceTitle: string;
  slotStart: string;
  slotEnd: string;
  timezone: string;
  meetingUrl?: string | null;
  eventUrl?: string | null;
};

export type BookingListItem = Booking & {
  lead: Pick<Lead, "id" | "name" | "email" | "qualificationResult">;
  service: {
    id: string;
    title: string;
    slug?: string | null;
    durationMinutes: number;
    displayPrice?: string | null;
    paymentRequired: boolean;
  };
};

export type BookingWithRelations = Booking & {
  hold: BookingHold;
  lead: Lead;
  service: {
    id: string;
    title: string;
    slug?: string | null;
    durationMinutes: number;
    displayPrice?: string | null;
    paymentRequired: boolean;
    preparationInstructions?: string | null;
  };
};

export type ExpireHoldCandidate = Pick<
  BookingHold,
  "id" | "professionalId" | "serviceId" | "expiresAt" | "status"
>;