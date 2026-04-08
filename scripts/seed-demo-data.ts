import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  const user = await prisma.user.upsert({
    where: {
      email: "demo@example.com",
    },
    update: {
      name: "John Carter",
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
    },
    create: {
      email: "demo@example.com",
      name: "John Carter",
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
    },
  });

  const profile = await prisma.professionalProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      fullName: "John Carter",
      slug: "john-carter",
      title: "Fractional CTO",
      headline:
        "I help SaaS founders fix product bottlenecks before they become growth problems.",
      bio: "Fractional CTO working with early-stage SaaS teams on architecture, product systems, hiring, and technical strategy.",
      avatarUrl:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
      timezone: "Europe/Berlin",
      ctaText: "Apply to work with me",
      onboardingCompleted: true,
      socialLinks: {
        website: "https://example.com/john",
        linkedin: "https://linkedin.com/in/john-carter",
        x: "https://x.com/johncarter",
      },
      brandSettings: {
        theme: "light",
        primaryColor: "#111827",
        accentColor: "#8B5CF6",
        fontPair: "inter-manrope",
      },
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeMinutes: 60,
      maxBookingsPerDay: 4,
    },
    create: {
      userId: user.id,
      fullName: "John Carter",
      slug: "john-carter",
      title: "Fractional CTO",
      headline:
        "I help SaaS founders fix product bottlenecks before they become growth problems.",
      bio: "Fractional CTO working with early-stage SaaS teams on architecture, product systems, hiring, and technical strategy.",
      avatarUrl:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
      timezone: "Europe/Berlin",
      ctaText: "Apply to work with me",
      onboardingCompleted: true,
      socialLinks: {
        website: "https://example.com/john",
        linkedin: "https://linkedin.com/in/john-carter",
        x: "https://x.com/johncarter",
      },
      brandSettings: {
        theme: "light",
        primaryColor: "#111827",
        accentColor: "#8B5CF6",
        fontPair: "inter-manrope",
      },
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeMinutes: 60,
      maxBookingsPerDay: 4,
    },
  });

  const strategySession = await prisma.service.upsert({
    where: {
      professionalProfileId_slug: {
        professionalProfileId: profile.id,
        slug: "fractional-cto-strategy-session",
      },
    },
    update: {
      title: "Fractional CTO Strategy Session",
      description:
        "A focused strategy call for founders who need clarity on product architecture, roadmap bottlenecks, or technical hiring.",
      displayPrice: "€250",
      durationMinutes: 45,
      preparationInstructions:
        "Bring your current product stage, main bottleneck, and one technical decision you need clarity on.",
      active: true,
    },
    create: {
      professionalProfileId: profile.id,
      title: "Fractional CTO Strategy Session",
      slug: "fractional-cto-strategy-session",
      description:
        "A focused strategy call for founders who need clarity on product architecture, roadmap bottlenecks, or technical hiring.",
      displayPrice: "€250",
      durationMinutes: 45,
      preparationInstructions:
        "Bring your current product stage, main bottleneck, and one technical decision you need clarity on.",
      active: true,
    },
  });

  const systemsAudit = await prisma.service.upsert({
    where: {
      professionalProfileId_slug: {
        professionalProfileId: profile.id,
        slug: "saas-product-systems-audit",
      },
    },
    update: {
      title: "SaaS Product Systems Audit",
      description:
        "A deeper review session covering delivery, architecture, product systems, and engineering priorities.",
      displayPrice: "€500",
      durationMinutes: 90,
      preparationInstructions:
        "Share architecture notes, roadmap docs, or team structure before the session.",
      active: true,
    },
    create: {
      professionalProfileId: profile.id,
      title: "SaaS Product Systems Audit",
      slug: "saas-product-systems-audit",
      description:
        "A deeper review session covering delivery, architecture, product systems, and engineering priorities.",
      displayPrice: "€500",
      durationMinutes: 90,
      preparationInstructions:
        "Share architecture notes, roadmap docs, or team structure before the session.",
      active: true,
    },
  });

  const questionRevenue = await prisma.qualificationQuestion.upsert({
    where: {
      professionalProfileId_sortOrder: {
        professionalProfileId: profile.id,
        sortOrder: 1,
      },
    },
    update: {
      questionText: "What is your current monthly revenue in EUR?",
      questionType: "NUMBER",
      helpText:
        "This helps me understand your stage and whether this session is the right fit.",
      isRequired: true,
    },
    create: {
      professionalProfileId: profile.id,
      questionText: "What is your current monthly revenue in EUR?",
      questionType: "NUMBER",
      helpText:
        "This helps me understand your stage and whether this session is the right fit.",
      sortOrder: 1,
      isRequired: true,
    },
  });

  const questionBlocker = await prisma.qualificationQuestion.upsert({
    where: {
      professionalProfileId_sortOrder: {
        professionalProfileId: profile.id,
        sortOrder: 2,
      },
    },
    update: {
      questionText: "What is your biggest technical blocker right now?",
      questionType: "LONG_TEXT",
      helpText: "Be specific. A good answer makes the session much more useful.",
      isRequired: true,
    },
    create: {
      professionalProfileId: profile.id,
      questionText: "What is your biggest technical blocker right now?",
      questionType: "LONG_TEXT",
      helpText: "Be specific. A good answer makes the session much more useful.",
      sortOrder: 2,
      isRequired: true,
    },
  });

  const questionUrgency = await prisma.qualificationQuestion.upsert({
    where: {
      professionalProfileId_sortOrder: {
        professionalProfileId: profile.id,
        sortOrder: 3,
      },
    },
    update: {
      questionText: "How urgent is solving this problem?",
      questionType: "MULTIPLE_CHOICE",
      helpText:
        "Urgency helps decide whether this should become a direct session or another resource.",
      optionsJson: ["This week", "This month", "Just exploring"],
      isRequired: true,
    },
    create: {
      professionalProfileId: profile.id,
      questionText: "How urgent is solving this problem?",
      questionType: "MULTIPLE_CHOICE",
      helpText:
        "Urgency helps decide whether this should become a direct session or another resource.",
      optionsJson: ["This week", "This month", "Just exploring"],
      sortOrder: 3,
      isRequired: true,
    },
  });

  await prisma.qualificationRule.upsert({
    where: {
      professionalProfileId_priority: {
        professionalProfileId: profile.id,
        priority: 1,
      },
    },
    update: {
      serviceId: strategySession.id,
      active: true,
      conditionsJson: {
        all: [
          {
            field: questionRevenue.id,
            operator: "gte",
            value: "5000",
          },
          {
            field: questionUrgency.id,
            operator: "in",
            value: "This week,This month",
          },
        ],
      },
      outcomeType: "ALLOW_BOOKING",
      outcomeValue: "Qualified leads can continue to booking.",
    },
    create: {
      professionalProfileId: profile.id,
      serviceId: strategySession.id,
      priority: 1,
      active: true,
      conditionsJson: {
        all: [
          {
            field: questionRevenue.id,
            operator: "gte",
            value: "5000",
          },
          {
            field: questionUrgency.id,
            operator: "in",
            value: "This week,This month",
          },
        ],
      },
      outcomeType: "ALLOW_BOOKING",
      outcomeValue: "Qualified leads can continue to booking.",
    },
  });

  await prisma.qualificationRule.upsert({
    where: {
      professionalProfileId_priority: {
        professionalProfileId: profile.id,
        priority: 2,
      },
    },
    update: {
      active: true,
      conditionsJson: {
        any: [
          {
            field: questionRevenue.id,
            operator: "lt",
            value: "5000",
          },
        ],
      },
      outcomeType: "REDIRECT",
      outcomeValue: "https://example.com/resources",
    },
    create: {
      professionalProfileId: profile.id,
      priority: 2,
      active: true,
      conditionsJson: {
        any: [
          {
            field: questionRevenue.id,
            operator: "lt",
            value: "5000",
          },
        ],
      },
      outcomeType: "REDIRECT",
      outcomeValue: "https://example.com/resources",
    },
  });

  const weeklyRules = [
    { weekday: "MONDAY", startTime: "09:00", endTime: "17:00" },
    { weekday: "TUESDAY", startTime: "09:00", endTime: "17:00" },
    { weekday: "WEDNESDAY", startTime: "09:00", endTime: "17:00" },
    { weekday: "THURSDAY", startTime: "09:00", endTime: "17:00" },
    { weekday: "FRIDAY", startTime: "09:00", endTime: "13:00" },
  ] as const;

  for (const rule of weeklyRules) {
    await prisma.availabilityRule.upsert({
      where: {
        professionalProfileId_weekday_startTime_endTime: {
          professionalProfileId: profile.id,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
        },
      },
      update: {
        active: true,
      },
      create: {
        professionalProfileId: profile.id,
        weekday: rule.weekday,
        startTime: rule.startTime,
        endTime: rule.endTime,
        active: true,
      },
    });
  }

  const blockedStart = new Date();
  blockedStart.setDate(blockedStart.getDate() + 7);
  blockedStart.setHours(9, 0, 0, 0);

  const blockedEnd = new Date(blockedStart);
  blockedEnd.setHours(17, 0, 0, 0);

  await prisma.blockedDate.upsert({
    where: {
      professionalProfileId_startDateTime_endDateTime: {
        professionalProfileId: profile.id,
        startDateTime: blockedStart,
        endDateTime: blockedEnd,
      },
    },
    update: {
      reason: "Conference day",
    },
    create: {
      professionalProfileId: profile.id,
      startDateTime: blockedStart,
      endDateTime: blockedEnd,
      reason: "Conference day",
    },
  });

  await prisma.accessCode.upsert({
    where: {
      professionalProfileId_code: {
        professionalProfileId: profile.id,
        code: "BETA2026",
      },
    },
    update: {
      codeLabel: "Founder beta invite",
      isActive: true,
    },
    create: {
      professionalProfileId: profile.id,
      code: "BETA2026",
      codeLabel: "Founder beta invite",
      isActive: true,
    },
  });

  await prisma.testimonial.upsert({
    where: {
      professionalProfileId_name_company: {
        professionalProfileId: profile.id,
        name: "Marta Nowak",
        company: "Flowstack",
      },
    },
    update: {
      role: "Founder",
      content:
        "John helped us identify the exact engineering bottleneck slowing our roadmap. Best strategic session we booked all quarter.",
      avatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80",
    },
    create: {
      professionalProfileId: profile.id,
      name: "Marta Nowak",
      role: "Founder",
      company: "Flowstack",
      content:
        "John helped us identify the exact engineering bottleneck slowing our roadmap. Best strategic session we booked all quarter.",
      avatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80",
    },
  });

  await prisma.testimonial.upsert({
    where: {
      professionalProfileId_name_company: {
        professionalProfileId: profile.id,
        name: "David Kim",
        company: "Orbitlane",
      },
    },
    update: {
      role: "CEO",
      content:
        "Clear, direct, and worth the money. He turned a messy technical situation into a prioritized plan in one call.",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    },
    create: {
      professionalProfileId: profile.id,
      name: "David Kim",
      role: "CEO",
      company: "Orbitlane",
      content:
        "Clear, direct, and worth the money. He turned a messy technical situation into a prioritized plan in one call.",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    },
  });

  const lead = await prisma.lead.upsert({
    where: {
      professionalProfileId_email_serviceId: {
        professionalProfileId: profile.id,
        email: "client@example.com",
        serviceId: strategySession.id,
      },
    },
    update: {
      name: "Sarah Founder",
      qualificationAnswers: {
        [questionRevenue.id]: 12000,
        [questionBlocker.id]:
          "We are struggling with engineering prioritization and architecture decisions.",
        [questionUrgency.id]: "This month",
      },
      qualificationStatus: "QUALIFIED",
      qualificationDecision: {
        result: "QUALIFIED",
        outcomeType: "ALLOW_BOOKING",
      },
    },
    create: {
      professionalProfileId: profile.id,
      serviceId: strategySession.id,
      name: "Sarah Founder",
      email: "client@example.com",
      qualificationAnswers: {
        [questionRevenue.id]: 12000,
        [questionBlocker.id]:
          "We are struggling with engineering prioritization and architecture decisions.",
        [questionUrgency.id]: "This month",
      },
      qualificationStatus: "QUALIFIED",
      qualificationDecision: {
        result: "QUALIFIED",
        outcomeType: "ALLOW_BOOKING",
      },
    },
  });

  const slotStart = new Date();
  slotStart.setDate(slotStart.getDate() + 3);
  slotStart.setHours(10, 0, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + strategySession.durationMinutes);

  await prisma.booking.upsert({
    where: {
      leadId_serviceId_slotStart: {
        leadId: lead.id,
        serviceId: strategySession.id,
        slotStart,
      },
    },
    update: {
      slotEnd,
      timezone: "Europe/Berlin",
      status: "EVENT_CREATION_PENDING",
      codeValidationStatus: "VALID",
      calendarStatus: "PENDING",
    },
    create: {
      professionalProfileId: profile.id,
      serviceId: strategySession.id,
      leadId: lead.id,
      slotStart,
      slotEnd,
      timezone: "Europe/Berlin",
      status: "EVENT_CREATION_PENDING",
      codeValidationStatus: "VALID",
      calendarStatus: "PENDING",
    },
  });

  console.log("✅ Demo data seed complete");
  console.log({
    userId: user.id,
    profileId: profile.id,
    services: [strategySession.id, systemsAudit.id],
    leadId: lead.id,
  });
}

main()
  .catch((error) => {
    console.error("❌ Demo data seed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });