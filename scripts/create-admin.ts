import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "admin"
  );
}

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

  // Derived from the email, not hardcoded to "admin" — a static slug
  // collides the moment a second admin is provisioned, since slugs are
  // unique across every professional on the platform, not just admins.
  const slug = slugify(email.split("@")[0] ?? name);

  const existingBySlug = await prisma.professional.findUnique({
    where: { slug },
    select: { userId: true },
  });

  if (existingBySlug && existingBySlug.userId !== user.id) {
    throw new Error(
      `Slug "${slug}" (derived from ${email}) is already in use by a different account. ` +
        `Set ADMIN_EMAIL to something that produces a unique slug.`,
    );
  }

  await prisma.professional.upsert({
    where: {
      userId: user.id,
    },
    update: {
      fullName: name,
      slug,
      onboardingCompleted: true,
    },
    create: {
      userId: user.id,
      fullName: name,
      slug,
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