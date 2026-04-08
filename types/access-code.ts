export type AccessCode = {
  id: string;
  professionalId: string;
  codeHash: string;
  codeLabel?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAccessCodeInput = {
  code: string;
  codeLabel?: string | null;
  isActive?: boolean;
};

export type UpdateAccessCodeInput = {
  code?: string;
  codeLabel?: string | null;
  isActive?: boolean;
};

export type AccessCodeListItem = Pick<
  AccessCode,
  "id" | "professionalId" | "codeLabel" | "isActive" | "createdAt" | "updatedAt"
>;

export type AccessCodeValidationInput = {
  professionalId: string;
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