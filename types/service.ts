// AvailabilityExposure mirrors the Prisma schema enum.
export type AvailabilityExposure =
  | "THREE_DAYS"
  | "FIVE_DAYS"
  | "ONE_WEEK"
  | "TWO_WEEKS"
  | "ONE_MONTH"
  | "TWO_MONTHS"
  | "ALL";

export type Service = {
  id: string;
  professionalId: string;
  title: string;
  slug?: string | null;
  headline?: string | null;
  description?: string | null;
  meetingFormat?: string | null;
  displayPrice?: string | null;
  currency?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  paymentRequired: boolean;
  qualificationRequired: boolean;
  accessCodeRequired: boolean;
  manualApprovalRequired: boolean;
  availabilityExposure: AvailabilityExposure;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicService = Pick<
  Service,
  | "id"
  | "professionalId"
  | "title"
  | "slug"
  | "headline"
  | "description"
  | "meetingFormat"
  | "displayPrice"
  | "currency"
  | "durationMinutes"
  | "preparationInstructions"
  | "paymentRequired"
  | "qualificationRequired"
  | "accessCodeRequired"
  | "manualApprovalRequired"
  | "availabilityExposure"
  | "active"
>;

export type CreateServiceInput = {
  title: string;
  slug?: string | null;
  headline?: string | null;
  description?: string | null;
  meetingFormat?: string | null;
  displayPrice?: string | null;
  currency?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  paymentRequired?: boolean;
  qualificationRequired?: boolean;
  accessCodeRequired?: boolean;
  manualApprovalRequired?: boolean;
  availabilityExposure?: AvailabilityExposure;
  sortOrder?: number;
  active?: boolean;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export type ReorderServicesInput = {
  serviceIds: string[];
};

export type ServiceSummary = Pick<
  Service,
  | "id"
  | "title"
  | "slug"
  | "headline"
  | "displayPrice"
  | "currency"
  | "durationMinutes"
  | "meetingFormat"
  | "paymentRequired"
  | "qualificationRequired"
  | "accessCodeRequired"
  | "manualApprovalRequired"
  | "availabilityExposure"
  | "sortOrder"
  | "active"
>;

export type ServiceListItem = ServiceSummary & {
  description?: string | null;
};

export type ServiceWithMeta = Service & {
  questionCount?: number;
  ruleCount?: number;
  bookingCount?: number;
};

export type ServiceSelection = {
  serviceId: string;
  title: string;
  slug?: string | null;
  durationMinutes: number;
  meetingFormat?: string | null;
  displayPrice?: string | null;
  currency?: string | null;
  paymentRequired: boolean;
};

export type ServiceAvailabilityRequest = {
  serviceId: string;
  startDate: string;
  endDate: string;
  timezone?: string;
};
