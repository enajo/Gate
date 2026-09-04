import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { profileRepository } from "@/server/repositories/profile.repository";
import { profileService } from "@/server/services/profile.service";

const onboardingInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  title: z.string().trim().min(1, "Role is required.").max(100),
  headline: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(100).optional(),
  onboardingSurvey: z
    .object({
      usageMode: z.enum(["SOLO", "TEAM"]),
      goals: z.array(z.string().trim().min(1).max(60)).max(10),
    })
    .optional(),
});

/**
 * Derive a URL-safe slug from a display name.
 * e.g. "John Carter" → "john-carter"
 */
function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "pro";
}

/**
 * Find a slug that isn't already taken by someone else.
 * Appends -2, -3, … until an available one is found.
 */
async function findAvailableSlug(
  name: string,
  userId: string,
): Promise<string> {
  const base = deriveSlug(name);

  // Check the base slug first
  const first = await profileRepository.findBySlug(base);
  if (!first || first.userId === userId) return base;

  // Try numbered variants
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const existing = await profileRepository.findBySlug(candidate);
    if (!existing || existing.userId === userId) return candidate;
  }

  throw new Error("Could not generate a unique URL for this name. Try a slightly different name.");
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const input = onboardingInputSchema.parse(json);

    const slug = await findAvailableSlug(input.name, session.user.id);

    await profileService.upsertProfile(session.user.id, {
      fullName: input.name,
      slug,
      title: input.title,
      headline: input.headline ?? null,
      timezone: "UTC",
      onboardingCompleted: false,
      industry: input.industry ?? null,
      onboardingSurvey: input.onboardingSurvey ?? null,
    });

    return NextResponse.json({ ok: true, slug }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 422 },
      );
    }

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
