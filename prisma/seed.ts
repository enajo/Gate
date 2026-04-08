import {
  PrismaClient,
  UserRole,
  QuestionType,
  QualificationOutcomeType,
  LeadQualificationResult,
  Weekday,
  CalendarProvider,
  CalendarSyncStatus,
  BookingHoldStatus,
  BookingStatus,
  CodeValidationStatus,
  CalendarStatus,
  CalendarEventSyncStatus,
  NotificationRecipientType,
  NotificationType,
  NotificationDeliveryStatus,
} from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashAccessCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function setTime(date: Date, hours: number, minutes = 0): Date {
  const copy = new Date(date);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

async function main() {
  const now = new Date();

  const DEMO_ACCESS_CODE = "BETA2026";
  const VIP_ACCESS_CODE = "VIPACCESS";

  // Clear data in dependency-safe order
  await prisma.notification.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.bookingHold.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.accessCode.deleteMany();
  await prisma.calendarAccount.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.qualificationRule.deleteMany();
  await prisma.qualificationQuestion.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.service.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      role: UserRole.ADMIN,
      emailVerified: now,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    },
  });

  const johnUser = await prisma.user.create({
    data: {
      name: "John Carter",
      email: "john@example.com",
      role: UserRole.USER,
      emailVerified: now,
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
    },
  });

  const sarahUser = await prisma.user.create({
    data: {
      name: "Sarah Malik",
      email: "sarah@example.com",
      role: UserRole.USER,
      emailVerified: now,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    },
  });

  void adminUser;

  // Professionals
  const johnProfessional = await prisma.professional.create({
    data: {
      userId: johnUser.id,
      fullName: "John Carter",
      slug: "john-carter",
      title: "Fractional CTO",
      headline: "I help SaaS founders fix product bottlenecks before they become growth problems.",
      bio: "Fractional CTO working with early-stage SaaS teams on architecture, product systems, hiring, and technical strategy.",
      avatarUrl: johnUser.image,
      brandSettings: {
        theme: "dark",
        primaryColor: "#111827",
        accentColor: "#8B5CF6",
        fontPair: "inter-manrope",
      },
      socialLinks: {
        website: "https://example.com/john",
        linkedin: "https://linkedin.com/in/john-carter",
        x: "https://x.com/johncarter",
      },
      timezone: "Europe/Berlin",
      onboardingCompleted: true,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      minimumNoticeMinutes: 120,
      maxBookingsPerDay: 4,
    },
  });

  const sarahProfessional = await prisma.professional.create({
    data: {
      userId: sarahUser.id,
      fullName: "Sarah Malik",
      slug: "sarah-malik",
      title: "Career Mentor",
      headline: "Interview prep and CV positioning for product and growth roles.",
      bio: "Career mentor focused on interview confidence, portfolio storytelling, and transitions into product roles.",
      avatarUrl: sarahUser.image,
      brandSettings: {
        theme: "light",
        primaryColor: "#0F172A",
        accentColor: "#2563EB",
        fontPair: "inter-space-grotesk",
      },
      socialLinks: {
        website: "https://example.com/sarah",
        linkedin: "https://linkedin.com/in/sarah-malik",
      },
      timezone: "Europe/Berlin",
      onboardingCompleted: true,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      minimumNoticeMinutes: 60,
      maxBookingsPerDay: 6,
    },
  });

  // Services
  const johnStrategySession = await prisma.service.create({
    data: {
      professionalId: johnProfessional.id,
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

  const johnAudit = await prisma.service.create({
    data: {
      professionalId: johnProfessional.id,
      title: "SaaS Product Systems Audit",
      slug: "saas-product-systems-audit",
      description:
        "A deeper review session covering delivery, architecture, product systems, and engineering priorities.",
      displayPrice: "€500",
      durationMinutes: 90,
      preparationInstructions:
        "Share any architecture notes, roadmap docs, or team structure overview before the session.",
      active: true,
    },
  });

  const sarahInterviewPrep = await prisma.service.create({
    data: {
      professionalId: sarahProfessional.id,
      title: "Product Interview Prep",
      slug: "product-interview-prep",
      description:
        "Mock interview and positioning feedback for product candidates preparing for upcoming interviews.",
      displayPrice: "€120",
      durationMinutes: 60,
      preparationInstructions:
        "Bring the job description and your current CV or LinkedIn profile.",
      active: true,
    },
  });

  // Testimonials
  await prisma.testimonial.createMany({
    data: [
      {
        professionalId: johnProfessional.id,
        name: "Marta Nowak",
        role: "Founder",
        company: "Flowstack",
        content:
          "John helped us identify the exact engineering bottleneck slowing our roadmap. Best strategic session we booked all quarter.",
        avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
        sortOrder: 1,
      },
      {
        professionalId: johnProfessional.id,
        name: "David Kim",
        role: "CEO",
        company: "Orbitlane",
        content:
          "Clear, direct, and worth the money. He turned a messy technical situation into a prioritized plan in one call.",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        sortOrder: 2,
      },
      {
        professionalId: sarahProfessional.id,
        name: "Nina Rossi",
        role: "Product Manager",
        company: "Freelance",
        content:
          "Sarah completely changed how I told my story in interviews. I landed two final rounds the same week.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        sortOrder: 1,
      },
    ],
  });

  // Qualification questions
  const q1 = await prisma.qualificationQuestion.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      questionText: "What is your current monthly revenue in EUR?",
      questionType: QuestionType.NUMBER,
      helpText: "This helps me understand your stage and whether this session is the right fit.",
      sortOrder: 1,
      isRequired: true,
    },
  });

  const q2 = await prisma.qualificationQuestion.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      questionText: "What is your biggest technical blocker right now?",
      questionType: QuestionType.LONG_TEXT,
      helpText: "Be specific. A good answer makes the session much more useful.",
      sortOrder: 2,
      isRequired: true,
    },
  });

  const q3 = await prisma.qualificationQuestion.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      questionText: "How urgent is solving this problem?",
      questionType: QuestionType.MULTIPLE_CHOICE,
      optionsJson: ["This week", "This month", "Just exploring"],
      helpText: "Urgency helps me prioritize whether this should become a direct session or another resource.",
      sortOrder: 3,
      isRequired: true,
    },
  });

  await prisma.qualificationQuestion.create({
    data: {
      professionalId: sarahProfessional.id,
      serviceId: sarahInterviewPrep.id,
      questionText: "Do you already have interviews scheduled?",
      questionType: QuestionType.YES_NO,
      helpText: "This helps me tailor the session to your current timeline.",
      sortOrder: 1,
      isRequired: true,
    },
  });

  // Qualification rules
  await prisma.qualificationRule.createMany({
    data: [
      {
        professionalId: johnProfessional.id,
        serviceId: johnStrategySession.id,
        conditionsJson: {
          all: [
            { field: q1.id, operator: "gte", value: 5000 },
            { field: q3.id, operator: "in", value: ["This week", "This month"] },
          ],
        },
        outcomeType: QualificationOutcomeType.ALLOW_BOOKING,
        outcomeValue: null,
        priority: 1,
        active: true,
      },
      {
        professionalId: johnProfessional.id,
        serviceId: johnStrategySession.id,
        conditionsJson: {
          any: [{ field: q1.id, operator: "lt", value: 5000 }],
        },
        outcomeType: QualificationOutcomeType.REDIRECT,
        outcomeValue: "https://example.com/john/resources",
        priority: 2,
        active: true,
      },
      {
        professionalId: johnProfessional.id,
        serviceId: johnStrategySession.id,
        conditionsJson: {
          any: [{ field: q2.id, operator: "contains", value: "student" }],
        },
        outcomeType: QualificationOutcomeType.REJECT,
        outcomeValue: "This session is currently reserved for active SaaS founders and operators.",
        priority: 3,
        active: true,
      },
    ],
  });

  // Availability rules
  await prisma.availabilityRule.createMany({
    data: [
      {
        professionalId: johnProfessional.id,
        weekday: Weekday.MONDAY,
        startTime: "09:00",
        endTime: "13:00",
        active: true,
      },
      {
        professionalId: johnProfessional.id,
        weekday: Weekday.TUESDAY,
        startTime: "10:00",
        endTime: "16:00",
        active: true,
      },
      {
        professionalId: johnProfessional.id,
        weekday: Weekday.WEDNESDAY,
        startTime: "09:00",
        endTime: "13:00",
        active: true,
      },
      {
        professionalId: johnProfessional.id,
        weekday: Weekday.THURSDAY,
        startTime: "10:00",
        endTime: "16:00",
        active: true,
      },
      {
        professionalId: johnProfessional.id,
        weekday: Weekday.FRIDAY,
        startTime: "09:00",
        endTime: "12:00",
        active: true,
      },
      {
        professionalId: sarahProfessional.id,
        weekday: Weekday.MONDAY,
        startTime: "11:00",
        endTime: "17:00",
        active: true,
      },
      {
        professionalId: sarahProfessional.id,
        weekday: Weekday.WEDNESDAY,
        startTime: "11:00",
        endTime: "17:00",
        active: true,
      },
      {
        professionalId: sarahProfessional.id,
        weekday: Weekday.FRIDAY,
        startTime: "10:00",
        endTime: "15:00",
        active: true,
      },
    ],
  });

  // Blocked dates
  await prisma.blockedDate.create({
    data: {
      professionalId: johnProfessional.id,
      startDateTime: setTime(addDays(now, 2), 12, 0),
      endDateTime: setTime(addDays(now, 2), 14, 0),
      reason: "Internal product review",
    },
  });

  // Calendar accounts: multiple calendars for one professional
  const johnPrimaryCalendar = await prisma.calendarAccount.create({
    data: {
      professionalId: johnProfessional.id,
      provider: CalendarProvider.GOOGLE,
      externalAccountId: "google-account-john-1",
      externalCalendarId: "john-primary@example.com",
      providerEmail: "john@example.com",
      calendarName: "John Primary",
      calendarTimeZone: "Europe/Berlin",
      accessTokenEncrypted: "enc_demo_access_token_primary",
      refreshTokenEncrypted: "enc_demo_refresh_token_primary",
      syncStatus: CalendarSyncStatus.CONNECTED,
      isActive: true,
      useForConflictCheck: true,
      isDefaultEventCalendar: true,
      lastSyncedAt: now,
    },
  });

  const johnWorkCalendar = await prisma.calendarAccount.create({
    data: {
      professionalId: johnProfessional.id,
      provider: CalendarProvider.GOOGLE,
      externalAccountId: "google-account-john-1",
      externalCalendarId: "john-work@example.com",
      providerEmail: "john@example.com",
      calendarName: "John Work",
      calendarTimeZone: "Europe/Berlin",
      accessTokenEncrypted: "enc_demo_access_token_work",
      refreshTokenEncrypted: "enc_demo_refresh_token_work",
      syncStatus: CalendarSyncStatus.CONNECTED,
      isActive: true,
      useForConflictCheck: true,
      isDefaultEventCalendar: false,
      lastSyncedAt: now,
    },
  });

  const sarahPrimaryCalendar = await prisma.calendarAccount.create({
    data: {
      professionalId: sarahProfessional.id,
      provider: CalendarProvider.GOOGLE,
      externalAccountId: "google-account-sarah-1",
      externalCalendarId: "sarah-primary@example.com",
      providerEmail: "sarah@example.com",
      calendarName: "Sarah Primary",
      calendarTimeZone: "Europe/Berlin",
      accessTokenEncrypted: "enc_demo_access_token_sarah",
      refreshTokenEncrypted: "enc_demo_refresh_token_sarah",
      syncStatus: CalendarSyncStatus.CONNECTED,
      isActive: true,
      useForConflictCheck: true,
      isDefaultEventCalendar: true,
      lastSyncedAt: now,
    },
  });

  void johnWorkCalendar;
  void sarahPrimaryCalendar;

  // Access codes (hash stored, not plaintext)
  await prisma.accessCode.createMany({
    data: [
      {
        professionalId: johnProfessional.id,
        codeHash: hashAccessCode(DEMO_ACCESS_CODE),
        codeLabel: "Beta Access",
        isActive: true,
      },
      {
        professionalId: johnProfessional.id,
        codeHash: hashAccessCode(VIP_ACCESS_CODE),
        codeLabel: "VIP Invite",
        isActive: true,
      },
      {
        professionalId: sarahProfessional.id,
        codeHash: hashAccessCode("CAREER2026"),
        codeLabel: "Pilot Cohort",
        isActive: true,
      },
    ],
  });

  // Leads
  const qualifiedLead = await prisma.lead.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      name: "Alex Founder",
      email: "alex.founder@example.com",
      answersJson: {
        [q1.id]: 12000,
        [q2.id]: "We are shipping too slowly and our product architecture is blocking roadmap execution.",
        [q3.id]: "This week",
      },
      qualificationResult: LeadQualificationResult.QUALIFIED,
    },
  });

  const redirectedLead = await prisma.lead.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      name: "Lina Explorer",
      email: "lina@example.com",
      answersJson: {
        [q1.id]: 1800,
        [q2.id]: "Still validating the idea and exploring possible tech stacks.",
        [q3.id]: "Just exploring",
      },
      qualificationResult: LeadQualificationResult.REDIRECTED,
    },
  });

  // Holds
  const convertedHold = await prisma.bookingHold.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      leadId: qualifiedLead.id,
      slotStart: setTime(addDays(now, 3), 11, 0),
      slotEnd: setTime(addDays(now, 3), 11, 45),
      expiresAt: setTime(addDays(now, 3), 11, 10),
      status: BookingHoldStatus.CONVERTED,
    },
  });

  const activeHold = await prisma.bookingHold.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      leadId: redirectedLead.id,
      slotStart: setTime(addDays(now, 4), 15, 0),
      slotEnd: setTime(addDays(now, 4), 15, 45),
      expiresAt: addDays(now, 0),
      status: BookingHoldStatus.ACTIVE,
    },
  });

  const retryHold = await prisma.bookingHold.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnAudit.id,
      leadId: qualifiedLead.id,
      slotStart: setTime(addDays(now, 5), 14, 0),
      slotEnd: setTime(addDays(now, 5), 15, 30),
      expiresAt: setTime(addDays(now, 5), 14, 10),
      status: BookingHoldStatus.CONVERTED,
    },
  });

  void activeHold;

  // Bookings
  const successfulBooking = await prisma.booking.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnStrategySession.id,
      leadId: qualifiedLead.id,
      holdId: convertedHold.id,
      slotStart: convertedHold.slotStart,
      slotEnd: convertedHold.slotEnd,
      timezone: "Europe/Berlin",
      status: BookingStatus.EVENT_CREATED,
      codeValidationStatus: CodeValidationStatus.VALID,
      calendarStatus: CalendarStatus.CREATED,
    },
  });

  const pendingEventBooking = await prisma.booking.create({
    data: {
      professionalId: johnProfessional.id,
      serviceId: johnAudit.id,
      leadId: qualifiedLead.id,
      holdId: retryHold.id,
      slotStart: retryHold.slotStart,
      slotEnd: retryHold.slotEnd,
      timezone: "Europe/Berlin",
      status: BookingStatus.EVENT_CREATION_PENDING,
      codeValidationStatus: CodeValidationStatus.VALID,
      calendarStatus: CalendarStatus.FAILED,
    },
  });

  // Calendar events
  await prisma.calendarEvent.create({
    data: {
      bookingId: successfulBooking.id,
      calendarAccountId: johnPrimaryCalendar.id,
      externalEventId: "evt_google_success_001",
      eventUrl: "https://calendar.google.com/calendar/event?eid=demo-success-001",
      meetingUrl: "https://meet.google.com/demo-success-001",
      syncStatus: CalendarEventSyncStatus.CREATED,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      bookingId: pendingEventBooking.id,
      calendarAccountId: johnPrimaryCalendar.id,
      externalEventId: "evt_google_failed_001",
      eventUrl: null,
      meetingUrl: null,
      syncStatus: CalendarEventSyncStatus.FAILED,
    },
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        bookingId: successfulBooking.id,
        recipientType: NotificationRecipientType.CLIENT,
        recipientEmail: qualifiedLead.email,
        type: NotificationType.BOOKING_CONFIRMED,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        providerMessageId: "msg_client_booking_confirmed_001",
        sentAt: now,
      },
      {
        bookingId: successfulBooking.id,
        recipientType: NotificationRecipientType.PROFESSIONAL,
        recipientEmail: johnUser.email,
        type: NotificationType.BOOKING_CONFIRMED,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        providerMessageId: "msg_pro_booking_confirmed_001",
        sentAt: now,
      },
      {
        bookingId: successfulBooking.id,
        recipientType: NotificationRecipientType.CLIENT,
        recipientEmail: qualifiedLead.email,
        type: NotificationType.EVENT_CREATED,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        providerMessageId: "msg_client_event_created_001",
        sentAt: now,
      },
      {
        bookingId: successfulBooking.id,
        recipientType: NotificationRecipientType.PROFESSIONAL,
        recipientEmail: johnUser.email,
        type: NotificationType.EVENT_CREATED,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        providerMessageId: "msg_pro_event_created_001",
        sentAt: now,
      },
      {
        bookingId: pendingEventBooking.id,
        recipientType: NotificationRecipientType.PROFESSIONAL,
        recipientEmail: johnUser.email,
        type: NotificationType.EVENT_CREATION_FAILED,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        providerMessageId: "msg_pro_event_failed_001",
        errorMessage: "Google Calendar event creation failed and should be retried by the background job.",
        sentAt: now,
      },
    ],
  });

  console.log("✅ Database seeded successfully.");
  console.log("");
  console.log("Demo professionals:");
  console.log(`- John Carter: /john-carter`);
  console.log(`- Sarah Malik: /sarah-malik`);
  console.log("");
  console.log("Demo access codes:");
  console.log(`- John Carter: ${DEMO_ACCESS_CODE}`);
  console.log(`- John Carter VIP: ${VIP_ACCESS_CODE}`);
  console.log(`- Sarah Malik: CAREER2026`);
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });