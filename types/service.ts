export type Service = {
  id: string;
  professionalId: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
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
  | "description"
  | "displayPrice"
  | "durationMinutes"
  | "preparationInstructions"
  | "active"
>;

export type CreateServiceInput = {
  title: string;
  slug?: string | null;
  description?: string | null;
  displayPrice?: string | null;
  durationMinutes: number;
  preparationInstructions?: string | null;
  active?: boolean;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export type ReorderServicesInput = {
  serviceIds: string[];
};

export type ServiceSummary = Pick<
  Service,
  "id" | "title" | "slug" | "displayPrice" | "durationMinutes" | "active"
>;

export type ServiceListItem = ServiceSummary & {
  description?: string | null;
};

export type ServiceWithMeta = Service & {
  questionCount?: number;
  ruleCount?: number;
};

export type ServiceSelection = {
  serviceId: string;
  title: string;
  slug?: string | null;
  durationMinutes: number;
  displayPrice?: string | null;
};

export type ServiceAvailabilityRequest = {
  serviceId: string;
  startDate: string;
  endDate: string;
  timezone?: string;
};