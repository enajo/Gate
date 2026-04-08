export type BookingHoldStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CONVERTED"
  | "RELEASED";

export type BookingStatus =
  | "PENDING_CODE"
  | "CODE_INVALID"
  | "CONFIRMED"
  | "EVENT_CREATION_PENDING"
  | "EVENT_CREATED"
  | "CANCELLED";

export type CodeValidationStatus = "PENDING" | "VALID" | "INVALID";

export type CalendarStatus = "PENDING" | "CREATED" | "FAILED";

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
  codeValidationStatus: CodeValidationStatus;
  calendarStatus: CalendarStatus;
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
  qualificationResult: "QUALIFIED" | "REJECTED" | "REDIRECTED";
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
  qualificationResult: Lead["qualificationResult"];
};

export type ConfirmBookingInput = {
  professionalId: string;
  serviceId: string;
  leadId: string;
  holdId: string;
  timezone: string;
  accessCode: string;
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
  codeValidationStatus?: CodeValidationStatus;
  calendarStatus?: CalendarStatus;
};

export type UpdateBookingStatusInput = {
  bookingId: string;
  status?: BookingStatus;
  codeValidationStatus?: CodeValidationStatus;
  calendarStatus?: CalendarStatus;
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
  accessCode: string;
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
    preparationInstructions?: string | null;
  };
};

export type ExpireHoldCandidate = Pick<
  BookingHold,
  "id" | "professionalId" | "serviceId" | "expiresAt" | "status"
>;