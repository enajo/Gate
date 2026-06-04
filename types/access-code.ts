export type AccessCode = {
  id: string;
  professionalId: string;
  serviceId?: string | null;
  codeHash: string;
  codeLabel?: string | null;
  isActive: boolean;
  usedAt?: Date | null;
  usedByEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAccessCodeInput = {
  code: string;
  codeLabel?: string | null;
  serviceId?: string | null;
  isActive?: boolean;
};

export type UpdateAccessCodeInput = {
  code?: string;
  codeLabel?: string | null;
  isActive?: boolean;
};

export type BulkGenerateAccessCodesInput = {
  serviceId?: string | null;
  count: number;
  labelPrefix?: string | null;
};

export type BulkGenerateAccessCodesResult = {
  codes: Array<{
    id: string;
    codeValue: string; // plain text — shown once, then lost
    codeLabel: string;
    serviceId: string | null;
  }>;
};

export type AccessCodeListItem = Pick<
  AccessCode,
  | "id"
  | "professionalId"
  | "serviceId"
  | "codeLabel"
  | "isActive"
  | "usedAt"
  | "usedByEmail"
  | "createdAt"
  | "updatedAt"
>;

export type AccessCodeValidationInput = {
  professionalId: string;
  serviceId?: string | null;
  code: string;
};

export type AccessCodeValidationResult = {
  isValid: boolean;
  matchedCodeId?: string | null;
  codeLabel?: string | null;
};

export type ToggleAccessCodeStatusInput = {
  accessCodeId: string;
  isActive: boolean;
};

export type AccessCodeSummary = {
  id: string;
  codeLabel?: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type AccessCodeUsageInfo = {
  accessCodeId: string;
  totalBookings: number;
  lastUsedAt?: Date | null;
};
