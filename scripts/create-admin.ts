import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const name = process.env.ADMIN_NAME || "Admin User";

  console.log(`Creating admin user for ${email}...`);

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      name,
      role: "ADMIN",
    },
    create: {
      email,
      name,
      role: "ADMIN",
    },
  });

  await prisma.professional.upsert({
    where: {
      userId: user.id,
    },
    update: {
      fullName: name,
      slug: "admin",
      onboardingCompleted: true,
    },
    create: {
      userId: user.id,
      fullName: name,
      slug: "admin",
      title: "Platform Admin",
      headline: "Internal admin account",
      bio: "Administrative account for managing the platform.",
      timezone: "Europe/Berlin",
      onboardingCompleted: true,
      brandSettings: {
        theme: "light",
        primaryColor: "#0f172a",
        accentColor: "#6366f1",
        fontPair: "inter-manrope",
      },
      socialLinks: {},
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeMinutes: 0,
      maxBookingsPerDay: null,
    },
  });

  console.log("✅ Admin user ready");
  console.log({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
}

main()
  .catch((error) => {
    console.error("❌ Failed to create admin user");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });