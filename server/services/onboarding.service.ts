import "server-only";

import type { ProfileCompletionState } from "@/types/profile";
import { accessCodeRepository } from "@/server/repositories/access-code.repository";
import { availabilityRepository } from "@/server/repositories/availability.repository";
import { googleRepository } from "@/server/repositories/google.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { qualificationRepository } from "@/server/repositories/qualification.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { profileService } from "@/server/services/profile.service";

export type OnboardingChecklist = {
  hasProfile: boolean;
  hasIdentity: boolean;
  hasHeadline: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
  hasBranding: boolean;
  hasSocialLinks: boolean;
  hasAtLeastOneService: boolean;
  hasQualificationQuestions: boolean;
  hasQualificationRules: boolean;
  hasAvailabilityRules: boolean;
  hasAccessCodes: boolean;
  hasConnectedCalendars: boolean;
  hasConflictCheckCalendar: boolean;
  hasDefaultEventCalendar: boolean;
};

export type OnboardingCounts = {
  services: number;
  questions: number;
  rules: number;
  availabilityRules: number;
  accessCodes: number;
  connectedCalendars: number;
  conflictCheckCalendars: number;
};

export type OnboardingState = {
  professionalId: string | null;
  slug: string | null;
  timezone: string | null;
  onboardingCompleted: boolean;
  checklist: OnboardingChecklist;
  profileCompletion: ProfileCompletionState;
  counts: OnboardingCounts;
  canPublish: boolean;
  completionPercentage: number;
};

const TOTAL_CHECKS = 9;

function buildEmptyProfileCompletion(): ProfileCompletionState {
  return {
    hasIdentity: false,
    hasHeadline: false,
    hasBio: false,
    hasAvatar: false,
    hasBranding: false,
    hasSocialLinks: false,
  };
}

function buildEmptyState(): OnboardingState {
  const profileCompletion = buildEmptyProfileCompletion();

  return {
    professionalId: null,
    slug: null,
    timezone: null,
    onboardingCompleted: false,
    checklist: {
      hasProfile: false,
      hasIdentity: false,
      hasHeadline: false,
      hasBio: false,
      hasAvatar: false,
      hasBranding: false,
      hasSocialLinks: false,
      hasAtLeastOneService: false,
      hasQualificationQuestions: false,
      hasQualificationRules: false,
      hasAvailabilityRules: false,
      hasAccessCodes: false,
      hasConnectedCalendars: false,
      hasConflictCheckCalendar: false,
      hasDefaultEventCalendar: false,
    },
    profileCompletion,
    counts: {
      services: 0,
      questions: 0,
      rules: 0,
      availabilityRules: 0,
      accessCodes: 0,
      connectedCalendars: 0,
      conflictCheckCalendars: 0,
    },
    canPublish: false,
    completionPercentage: 0,
  };
}

function calculateCompletionPercentage(checklist: OnboardingChecklist): number {
  const completed = [
    checklist.hasIdentity,
    checklist.hasHeadline,
    checklist.hasAtLeastOneService,
    checklist.hasQualificationQuestions,
    checklist.hasQualificationRules,
    checklist.hasAvailabilityRules,
    checklist.hasAccessCodes,
    checklist.hasConnectedCalendars,
    checklist.hasDefaultEventCalendar,
  ].filter(Boolean).length;

  return Math.round((completed / TOTAL_CHECKS) * 100);
}

function canPublishFromChecklist(checklist: OnboardingChecklist): boolean {
  return (
    checklist.hasProfile &&
    checklist.hasIdentity &&
    checklist.hasHeadline &&
    checklist.hasAtLeastOneService &&
    checklist.hasQualificationQuestions &&
    checklist.hasQualificationRules &&
    checklist.hasAvailabilityRules &&
    checklist.hasAccessCodes &&
    checklist.hasConnectedCalendars &&
    checklist.hasDefaultEventCalendar
  );
}

async function requireProfessional(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

export const onboardingService = {
  async getState(userId: string): Promise<OnboardingState> {
    const professional = await profileRepository.findByUserId(userId);

    if (!professional) {
      return buildEmptyState();
    }

    const [
      profileCompletion,
      servicesCount,
      questionsCount,
      rulesCount,
      availabilityRulesCount,
      accessCodesCount,
      connectedCalendarsCount,
      conflictCheckCalendarsCount,
      defaultEventCalendar,
    ] = await Promise.all([
      profileService.getProfileCompletionState(userId),
      serviceRepository.countByProfessionalId(professional.id),
      qualificationRepository.countQuestionsByProfessionalId(professional.id),
      qualificationRepository.countRulesByProfessionalId(professional.id),
      availabilityRepository.countAvailabilityRulesByProfessionalId(
        professional.id,
      ),
      accessCodeRepository.countActiveByProfessionalId(professional.id),
      googleRepository.countCalendarAccountsByProfessionalId(professional.id),
      googleRepository.countActiveConflictCalendarsByProfessionalId(
        professional.id,
      ),
      googleRepository.findDefaultEventCalendarByProfessionalId(professional.id),
    ]);

    const checklist: OnboardingChecklist = {
      hasProfile: true,
      hasIdentity: profileCompletion.hasIdentity,
      hasHeadline: profileCompletion.hasHeadline,
      hasBio: profileCompletion.hasBio,
      hasAvatar: profileCompletion.hasAvatar,
      hasBranding: profileCompletion.hasBranding,
      hasSocialLinks: profileCompletion.hasSocialLinks,
      hasAtLeastOneService: servicesCount > 0,
      hasQualificationQuestions: questionsCount > 0,
      hasQualificationRules: rulesCount > 0,
      hasAvailabilityRules: availabilityRulesCount > 0,
      hasAccessCodes: accessCodesCount > 0,
      hasConnectedCalendars: connectedCalendarsCount > 0,
      hasConflictCheckCalendar: conflictCheckCalendarsCount > 0,
      hasDefaultEventCalendar: Boolean(defaultEventCalendar),
    };

    const counts: OnboardingCounts = {
      services: servicesCount,
      questions: questionsCount,
      rules: rulesCount,
      availabilityRules: availabilityRulesCount,
      accessCodes: accessCodesCount,
      connectedCalendars: connectedCalendarsCount,
      conflictCheckCalendars: conflictCheckCalendarsCount,
    };

    const canPublish = canPublishFromChecklist(checklist);
    const completionPercentage = calculateCompletionPercentage(checklist);

    return {
      professionalId: professional.id,
      slug: professional.slug,
      timezone: professional.timezone,
      onboardingCompleted: professional.onboardingCompleted,
      checklist,
      profileCompletion,
      counts,
      canPublish,
      completionPercentage,
    };
  },

  async getChecklist(userId: string): Promise<OnboardingChecklist> {
    const state = await this.getState(userId);
    return state.checklist;
  },

  async isReadyToPublish(userId: string): Promise<boolean> {
    const state = await this.getState(userId);
    return state.canPublish;
  },

  async markCompletedIfReady(userId: string): Promise<OnboardingState> {
    const professional = await requireProfessional(userId);
    const state = await this.getState(userId);

    if (state.canPublish && !professional.onboardingCompleted) {
      await profileRepository.updateById(professional.id, {
        onboardingCompleted: true,
      });
    }

    return this.getState(userId);
  },

  async resetCompletion(userId: string): Promise<OnboardingState> {
    const professional = await requireProfessional(userId);

    await profileRepository.updateById(professional.id, {
      onboardingCompleted: false,
    });

    return this.getState(userId);
  },
};