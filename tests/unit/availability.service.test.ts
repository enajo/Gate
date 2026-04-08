import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  findById: vi.fn(),
}));

const mockServiceRepository = vi.hoisted(() => ({
  findByIdForProfessional: vi.fn(),
}));

const mockQualificationRepository = vi.hoisted(() => ({
  findQuestionById: vi.fn(),
  findRuleById: vi.fn(),
  findQuestionByIdForProfessional: vi.fn(),
  findRuleByIdForProfessional: vi.fn(),
  findQuestionsByProfessionalId: vi.fn(),
  findRulesByProfessionalId: vi.fn(),
  findQuestionsForFlow: vi.fn(),
  getFlowData: vi.fn(),
  createQuestionForProfessional: vi.fn(),
  createRuleForProfessional: vi.fn(),
  updateQuestionById: vi.fn(),
  updateRuleById: vi.fn(),
  deleteQuestionById: vi.fn(),
  deleteRuleById: vi.fn(),
}));

const mockBookingRepository = vi.hoisted(() => ({
  createLeadForProfessional: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

vi.mock("@/server/repositories/service.repository", () => ({
  serviceRepository: mockServiceRepository,
}));

vi.mock("@/server/repositories/qualification.repository", () => ({
  qualificationRepository: mockQualificationRepository,
}));

vi.mock("@/server/repositories/booking.repository", () => ({
  bookingRepository: mockBookingRepository,
}));

vi.mock("@/server/validators/qualification.validator", () => ({
  createQualificationQuestionSchema: { parse: vi.fn((value) => value) },
  createQualificationRuleSchema: { parse: vi.fn((value) => value) },
  updateQualificationQuestionSchema: { parse: vi.fn((value) => value) },
  updateQualificationRuleSchema: { parse: vi.fn((value) => value) },
  qualificationPreviewSchema: { parse: vi.fn((value) => value) },
  qualificationSubmissionSchema: { parse: vi.fn((value) => value) },
}));

import { qualificationService } from "@/server/services/qualification.service";

describe("qualificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockProfileRepository.findById.mockResolvedValue({
      id: "professional_1",
      userId: "user_1",
      fullName: "John Carter",
    });

    mockProfileRepository.findByUserId.mockResolvedValue({
      id: "professional_1",
      userId: "user_1",
      fullName: "John Carter",
    });

    mockServiceRepository.findByIdForProfessional.mockResolvedValue({
      id: "service_1",
      professionalId: "professional_1",
      title: "Strategy Session",
      slug: "strategy-session",
    });
  });

  describe("previewEvaluation", () => {
    it("returns ALLOW_BOOKING when the highest-priority matching active rule allows booking", async () => {
      const result = await qualificationService.previewEvaluation({
        answers: {
          revenue: 12000,
          urgency: "This month",
        },
        rules: [
          {
            id: "rule_reject",
            professionalId: "professional_1",
            serviceId: "service_1",
            conditionsJson: {
              all: [
                {
                  field: "revenue",
                  operator: "less_than",
                  value: 5000,
                },
              ],
            },
            outcomeType: "REJECT",
            outcomeValue: "Too early.",
            priority: 2,
            active: true,
          },
          {
            id: "rule_allow",
            professionalId: "professional_1",
            serviceId: "service_1",
            conditionsJson: {
              all: [
                {
                  field: "revenue",
                  operator: "greater_than_or_equal",
                  value: 5000,
                },
              ],
              any: [
                {
                  field: "urgency",
                  operator: "equals",
                  value: "This month",
                },
                {
                  field: "urgency",
                  operator: "equals",
                  value: "This week",
                },
              ],
            },
            outcomeType: "ALLOW_BOOKING",
            outcomeValue: "Proceed to booking.",
            priority: 1,
            active: true,
          },
        ],
      });

      expect(result).toMatchObject({
        result: "QUALIFIED",
        outcomeType: "ALLOW_BOOKING",
        outcomeValue: "Proceed to booking.",
        matchedRuleId: "rule_allow",
      });
      expect(result.matchedConditions).toHaveLength(2);
    });

    it("ignores inactive rules and falls back to default rejection when nothing matches", async () => {
      const result = await qualificationService.previewEvaluation({
        answers: {
          revenue: 1000,
        },
        rules: [
          {
            id: "rule_inactive_allow",
            professionalId: "professional_1",
            serviceId: null,
            conditionsJson: {
              all: [
                {
                  field: "revenue",
                  operator: "greater_than",
                  value: 0,
                },
              ],
            },
            outcomeType: "ALLOW_BOOKING",
            outcomeValue: "Should not be used.",
            priority: 1,
            active: false,
          },
        ],
      });

      expect(result).toMatchObject({
        result: "REJECTED",
        outcomeType: "REJECT",
        matchedRuleId: null,
      });
      expect(result.outcomeValue).toBe("This request is not a fit right now.");
      expect(result.matchedConditions).toEqual([]);
    });

    it("supports redirect outcomes", async () => {
      const result = await qualificationService.previewEvaluation({
        answers: {
          revenue: 1500,
        },
        rules: [
          {
            id: "rule_redirect",
            professionalId: "professional_1",
            serviceId: null,
            conditionsJson: {
              all: [
                {
                  field: "revenue",
                  operator: "less_than",
                  value: 5000,
                },
              ],
            },
            outcomeType: "REDIRECT",
            outcomeValue: "https://example.com/resources",
            priority: 1,
            active: true,
          },
        ],
      });

      expect(result).toMatchObject({
        result: "REDIRECTED",
        outcomeType: "REDIRECT",
        outcomeValue: "https://example.com/resources",
        matchedRuleId: "rule_redirect",
      });
    });
  });

  describe("submitQualification", () => {
    it("creates a lead and returns evaluation for a qualified submission", async () => {
      mockQualificationRepository.getFlowData.mockResolvedValue({
        questions: [
          {
            id: "question_revenue",
            professionalId: "professional_1",
            serviceId: "service_1",
            questionText: "What is your monthly revenue?",
            questionType: "NUMBER",
            optionsJson: null,
            helpText: null,
            sortOrder: 1,
            isRequired: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "question_urgency",
            professionalId: "professional_1",
            serviceId: "service_1",
            questionText: "How urgent is this?",
            questionType: "MULTIPLE_CHOICE",
            optionsJson: ["This week", "This month", "Just exploring"],
            helpText: null,
            sortOrder: 2,
            isRequired: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        rules: [
          {
            id: "rule_allow",
            professionalId: "professional_1",
            serviceId: "service_1",
            conditionsJson: {
              all: [
                {
                  field: "question_revenue",
                  operator: "greater_than_or_equal",
                  value: 5000,
                },
              ],
              any: [
                {
                  field: "question_urgency",
                  operator: "equals",
                  value: "This week",
                },
                {
                  field: "question_urgency",
                  operator: "equals",
                  value: "This month",
                },
              ],
            },
            outcomeType: "ALLOW_BOOKING",
            outcomeValue: "Proceed to booking.",
            priority: 1,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      mockBookingRepository.createLeadForProfessional.mockResolvedValue({
        id: "lead_1",
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Sarah Founder",
        email: "sarah@example.com",
        answersJson: {
          question_revenue: 12000,
          question_urgency: "This month",
        },
        qualificationResult: "QUALIFIED",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await qualificationService.submitQualification({
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Sarah Founder",
        email: "sarah@example.com",
        answers: {
          question_revenue: 12000,
          question_urgency: "This month",
        },
      });

      expect(mockBookingRepository.createLeadForProfessional).toHaveBeenCalledWith(
        "professional_1",
        expect.objectContaining({
          serviceId: "service_1",
          name: "Sarah Founder",
          email: "sarah@example.com",
          qualificationResult: "QUALIFIED",
        }),
      );

      expect(result.evaluation).toMatchObject({
        result: "QUALIFIED",
        outcomeType: "ALLOW_BOOKING",
        outcomeValue: "Proceed to booking.",
        matchedRuleId: "rule_allow",
      });

      expect(result.lead).toMatchObject({
        id: "lead_1",
        professionalId: "professional_1",
        serviceId: "service_1",
        name: "Sarah Founder",
        email: "sarah@example.com",
        qualificationResult: "QUALIFIED",
      });
    });

    it("throws when a required answer is missing", async () => {
      mockQualificationRepository.getFlowData.mockResolvedValue({
        questions: [
          {
            id: "question_required",
            professionalId: "professional_1",
            serviceId: "service_1",
            questionText: "What is your monthly revenue?",
            questionType: "NUMBER",
            optionsJson: null,
            helpText: null,
            sortOrder: 1,
            isRequired: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        rules: [],
      });

      await expect(
        qualificationService.submitQualification({
          professionalId: "professional_1",
          serviceId: "service_1",
          name: "Sarah Founder",
          email: "sarah@example.com",
          answers: {},
        }),
      ).rejects.toThrow(
        "Missing answer for required question: What is your monthly revenue?",
      );

      expect(mockBookingRepository.createLeadForProfessional).not.toHaveBeenCalled();
    });

    it("throws when the service does not belong to the professional", async () => {
      mockServiceRepository.findByIdForProfessional.mockResolvedValueOnce(null);

      await expect(
        qualificationService.submitQualification({
          professionalId: "professional_1",
          serviceId: "service_1",
          name: "Sarah Founder",
          email: "sarah@example.com",
          answers: {},
        }),
      ).rejects.toThrow("Service not found.");

      expect(mockQualificationRepository.getFlowData).not.toHaveBeenCalled();
      expect(mockBookingRepository.createLeadForProfessional).not.toHaveBeenCalled();
    });

    it("throws when the professional profile does not exist", async () => {
      mockProfileRepository.findById.mockResolvedValueOnce(null);

      await expect(
        qualificationService.submitQualification({
          professionalId: "missing_professional",
          serviceId: "service_1",
          name: "Sarah Founder",
          email: "sarah@example.com",
          answers: {},
        }),
      ).rejects.toThrow("Professional profile not found.");

      expect(mockBookingRepository.createLeadForProfessional).not.toHaveBeenCalled();
    });
  });
});